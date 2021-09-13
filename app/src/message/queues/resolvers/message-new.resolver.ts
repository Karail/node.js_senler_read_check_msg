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
import { MessageCheckCron } from '../../../message/cron';
// Dto
import { MessageDto } from '../../../message/dto';
// Workers
import { VkQueueWorker } from '../../../vk/queues/workers';
// Resolvers
import { VkQueueResolver } from '../../../vk/queues/resolvers';
// Jobs
import { VK_QUEUE_ } from '../../../vk/queues/resolvers/vk-queue.resolver';
import { MESSAGE_CHECK_ } from './message-check.resolver';
import {Rabbit} from "../../../shared/queues";

// Jobs
export const MESSAGE_NEW = 'message-new';


export class MessageNewQueueResolver extends BaseQueueResolver {

    constructor(
        public readonly queueName: string,
        public readonly exchangeName: string = '',
        public rabbitProviderSenler: Rabbit
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
     * для групп сообщений
     */
    public addConsumer(): void {
        this.consumer.consume(async (message: any) => {
            if (message) {
                this.dateLastMessage = new Date();

                const content: MessageDto = JSON.parse(message.content.toString()).payload;

                console.log('new', content);

                const keyPrefixQueue = content.vk_group_id;

                const queue = (await this.getQueuesList(1, `${MESSAGE_CHECK_}${keyPrefixQueue}`))?.[0];

                if (!queue) {
                    console.log('no');


                    const vkQueueResolver = await this.queueService.createQueue(
                        this.rabbitProviderSenler,
                        new VkQueueWorker(),
                        new VkQueueResolver(`${VK_QUEUE_}${keyPrefixQueue}`), 0,
                        this.redisProvider,
                        this.localStorage,
                        this.mongoProvider,
                    );

                    const messageCheckWorker = new MessageCheckWorker();
                    messageCheckWorker.setVkQueueResolver(vkQueueResolver);

                    const resolver = await this.queueService.createQueue(
                        this.rabbitProvider,
                        messageCheckWorker,
                        new MessageCheckQueueResolver(`${MESSAGE_CHECK_}${keyPrefixQueue}`, this.exchangeName), 0,
                        this.redisProvider,
                        this.localStorage,
                        this.mongoProvider,
                    );

                    const messageCheckCron = this.queueService.createCron(
                        new MessageCheckCron(keyPrefixQueue),
                        this.rabbitProvider,
                        messageCheckWorker,
                        this.redisProvider,
                        this.localStorage,
                        this.mongoProvider,
                    );

                    resolver.sendToQueue(content);

                    this.localStorage.setQueue({ resolver, crons: [ messageCheckCron ] });
                }
                else {
                    console.log('is');
                }
            }
        }, { noAck: true });
    }
}
