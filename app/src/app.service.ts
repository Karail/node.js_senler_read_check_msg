// Reslovers
import { MessageNewQueueResolver, MessageCheckQueueResolver } from './message/queues/resolvers';
import { VkQueueResolver } from './vk/queues/resolvers';
// Workers
import { MessageCheckInactivityWorker, MessageCheckWorker, MessageNewWorker } from './message/queues/workers';
import { VkQueueWorker } from './vk/queues/workers';
// Queues
import { Rabbit, Redis } from './shared/queues';
// Services
import { Logger } from './shared/services';
import { QueueService } from './shared/services';
// Exchangers
import { MessageExchange } from './message/exchangers';
// Cron
import { MessageCheckCron, MessageCheckInactivityCron } from './message/cron';
import { VkQueueCheckCron } from './vk/cron';
// Storage
import { LocalStorage } from './local-storage';
// Jobs
import { MESSAGE_NEW } from './message/queues/resolvers/message-new.resolver';
import { MESSAGE_CHECK_ } from './message/queues/resolvers/message-check.resolver';
import { VK_QUEUE_ } from './vk/queues/resolvers/vk-queue.resolver';



import { InitQueue } from './consumer';



export class AppService {
    /**
     * нстанс хранилища
     */
    private readonly localStorage = new LocalStorage();
    /**
     * Сервис для работы с очередями
     */
    private readonly queueService = new QueueService();
    /**
     * Инстанс брокера
     */
    private readonly rabbitProvider = new Rabbit();
    /**
     * Инстанс Redis Pub
     */
    private readonly redisProvider = new Redis({
        port: Number(process.env.REDIS_PORT),
        host: String(process.env.REDIS_HOST),
    });

    /**
     * On Module Init
     */
    public async init() {
        try {

            await InitQueue();

            await this.rabbitProvider.createConnection();

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
                new MessageExchange('message-exchange', 'x-delayed-message'),
                {
                    durable: false,
                    autoDelete: false,
                    arguments: {
                        'x-delayed-type': 'direct'
                    }
                }
            );

            // // Init Queues
            const queues = (await this.rabbitProvider.getQueuesList(1, MESSAGE_CHECK_))
                .map((item) => item.name);

            for (const queue of queues) {

                const keyPrefixQueue = queue.replace(MESSAGE_CHECK_, '');

                const vkQueueResolver = await this.queueService.createQueue(
                    this.rabbitProvider,
                    new VkQueueWorker(),
                    new VkQueueResolver(`${VK_QUEUE_}${keyPrefixQueue}`), 0,
                    this.redisProvider,
                    this.localStorage
                );

                const messageCheckWorker = new MessageCheckWorker();
                messageCheckWorker.setVkQueueResolver(vkQueueResolver);

                const resolver = await this.queueService.createQueue(
                    this.rabbitProvider,
                    messageCheckWorker,
                    new MessageCheckQueueResolver(queue, exchange.exchangeName), 0,
                    this.redisProvider,
                    this.localStorage
                );

                const messageCheckCron = this.queueService.createCron(
                    new MessageCheckCron(keyPrefixQueue),
                    this.rabbitProvider,
                    messageCheckWorker,
                    this.redisProvider,
                    this.localStorage,
                );

                this.localStorage.setQueue({ resolver, crons: [ messageCheckCron ] });
            }

            await this.queueService.createQueue(
                this.rabbitProvider,
                new MessageNewWorker(),
                new MessageNewQueueResolver(MESSAGE_NEW, exchange.exchangeName), 0,
                this.redisProvider,
                this.localStorage
            );

            this.queueService.createCron(
                new MessageCheckInactivityCron(0),
                this.rabbitProvider,
                new MessageCheckInactivityWorker(),
                this.redisProvider,
                this.localStorage,
            );

            this.queueService.createCron(
                new VkQueueCheckCron(0),
                this.rabbitProvider,
                new VkQueueWorker(),
                this.redisProvider,
                this.localStorage,
            );

            exchange.publish(exchange.exchangeName, {
                id: 3,
                user_id: 2,
                group_id: 1,
                read_state: 0
            }, {
                persistent: false,
                headers: {
                    'x-delay': 1000
                }
            });

            // setTimeout(() => {
            //     exchange.publish(exchange.exchangeName, {
            //         id: 4,
            //         user_id: 2,
            //         group_id: 2
            //     }, {
            //         persistent: false,
            //         headers: {
            //             'x-delay': 1000
            //         }
            //     });
            // }, 10000);
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }
}