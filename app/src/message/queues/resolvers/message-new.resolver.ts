// Resolvers
import { MessageCheckQueueResolver } from '../resolvers';
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { MessageNewQueueConsumer } from '../consumers';
// Producers
import { MessageNewQueueProducer } from '../producers';
// Workers
import { MessageCheckWorker } from '../workers';
// Services
import { Logger } from '../../../shared/services';
// Cron
import { MessageCheckCron, MessageVkQueueCheckCron } from '../../../message/cron';
// Dto
import { MessageDto } from 'src/message/dto';

export class MessageNewQueueResolver extends BaseQueueResolver {

    constructor(
        public readonly queueName: string,
        public readonly exchangeName: string = '',
    ) {
        super(new MessageNewQueueProducer(), new MessageNewQueueConsumer(), queueName);
    }

    async start() {
        try {
            await super.start();
            await this.rabbitProvider.bindQueue(
                this.exchangeName,
                this.queueName,
                this.exchangeName,
            );
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    /**
     * Создает очередь message-check которая прослушивает сообщения из своей группы если такой очереди еще не сущаествует и отправляет в эту очередь
     * Создает cron MessageCheckCron
     * Создает cron MessageVkQueueCheckCron
     * для групп сообщений
     */
    public addConsumer(): void {
        this.consumer.consume(async (message: any) => {
            if (message) {

                const content: MessageDto = JSON.parse(message.content.toString()).payload;

                console.log('new', content);

                const keyPrefixQueue = content.group_id;

                const queues = await this.getQueuesList();

                const isQueue = queues
                    .map((item) => item.name)
                    .includes(`message-check-${keyPrefixQueue}`);

                if (!isQueue) {
                    console.log('no');

                    const resolver = await this.queueService.createQueue(
                        this.rabbitProvider,
                        new MessageCheckWorker(),
                        new MessageCheckQueueResolver(`message-check-${keyPrefixQueue}`, this.exchangeName),
                        0,
                        this.redisPubProvider,
                        this.redisSubProvider,
                    );

                    const messageCheckCron = new MessageCheckCron(keyPrefixQueue);
                    messageCheckCron.setRedisPubProvider(this.redisPubProvider);
                    messageCheckCron.setRedisSubProvider(this.redisSubProvider);
                    messageCheckCron.setWorker(new MessageCheckWorker());
                    messageCheckCron.start();
                    
                    const messageVkQueueCheckCron = new MessageVkQueueCheckCron(keyPrefixQueue);
                    messageVkQueueCheckCron.setRedisPubProvider(this.redisPubProvider);
                    messageVkQueueCheckCron.setRedisSubProvider(this.redisSubProvider);
                    messageCheckCron.setWorker(new MessageCheckWorker());
                    messageVkQueueCheckCron.start();

                    resolver.sendToQueue(content);
                }
                else {
                    console.log('is');
                }
            }
        }, { noAck: true });
    }
}