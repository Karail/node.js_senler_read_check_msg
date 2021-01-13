// Reslovers
import { MessageNewQueueResolver } from './message/queues/resolvers';
import { MessageCheckQueueResolver } from './message/queues/resolvers';
// Workers
import { MessageCheckWorker, MessageNewWorker } from './message/queues/workers';
// Queues
import { Rabbit, Redis } from './shared/queues';
// Services
import { Logger } from './shared/services';
import { QueueService } from './shared/services/queue.service';
// Exchangers
import { MessageExchange } from './message/exchangers';
// Cron
import { MessageCheckCron, MessageVkQueueCheckCron } from './message/cron';

export class AppService {

    private readonly queueService = new QueueService();

    private readonly rabbitProvider = new Rabbit();

    private readonly redisPubProvider = new Redis({
        port: Number(process.env.REDIS_PORT),
        host: String(process.env.REDIS_HOST),
    });

    private readonly redisSubProvider = new Redis({
        port: Number(process.env.REDIS_PORT),
        host: String(process.env.REDIS_HOST),
    });

    /**
     * On Module Init
     */
    public async init() {
        try {

            await this.rabbitProvider.createConnection();

            Logger.info('Create rabbit connection');
            Logger.info('Create redis connection');

            await this.initQueues();

        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    private async initQueues() {
        try {
            // Init Exchangers
            const exchange = await this.queueService.createExchange(
                this.rabbitProvider,
                new MessageExchange('message-exchange'),
                {
                    durable: false,
                    autoDelete: false,
                    arguments: {
                        'x-delayed-type': 'direct'
                    }
                }
            );

            // Init Queues
            const queues = (await this.rabbitProvider.getQueuesList())
                .map((item) => item.name)
                .filter((item) => item !== 'message-new');

            for (const queue of queues) {

                const keyPrefixQueue = queue.replace('message-check-', '');

                await this.queueService.createQueue(
                    this.rabbitProvider,
                    new MessageCheckWorker(),
                    new MessageCheckQueueResolver(queue, exchange.exchangeName),
                    0,
                    this.redisPubProvider,
                    this.redisSubProvider,
                );

                const messageCheckCron = new MessageCheckCron(keyPrefixQueue);
                messageCheckCron.setRedisPubProvider(this.redisPubProvider);
                messageCheckCron.setRedisSubProvider(this.redisSubProvider);
                messageCheckCron.setWorker(new MessageCheckWorker());
                messageCheckCron.start();
                    
                const messageVkQueueCheckCron = new MessageVkQueueCheckCron(keyPrefixQueue)
                messageVkQueueCheckCron.setRedisPubProvider(this.redisPubProvider);
                messageVkQueueCheckCron.setRedisSubProvider(this.redisSubProvider);
                messageCheckCron.setWorker(new MessageCheckWorker());
                messageVkQueueCheckCron.start();
            }
            await this.queueService.createQueue(
                this.rabbitProvider,
                new MessageNewWorker(),
                new MessageNewQueueResolver('message-new', exchange.exchangeName),
                0,
                this.redisPubProvider,
                this.redisSubProvider,
            );

            exchange.publish(exchange.exchangeName, {
                id: 3,
                user_id: 2,
                group_id: 1
            }, {
                persistent: false,
                headers: {
                    'x-delay': 1000
                }
            });
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }
}