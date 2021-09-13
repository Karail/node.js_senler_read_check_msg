import amqp from 'amqplib';
// Resolvers
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { MessageCheckQueueConsumer } from '../consumers';
// Producers
import { MessageCheckQueueProducer } from '../producers';
// Services
import { Logger } from '../../../shared/services';
// Dto
import { MessageDto } from '../../../message/dto';
// Workers
import { MessageCheckWorker } from '../workers';
// Jobs
import { VK_QUEUE_ } from '../../../vk/queues/resolvers/vk-queue.resolver';

// Jobs
export const MESSAGE_CHECK_ = 'message-check-';

export class MessageCheckQueueResolver extends BaseQueueResolver {

    public readonly worker!: MessageCheckWorker;

    constructor(
        public readonly queueName: string,
        public readonly exchangeName: string = '',
    ) {
        super(new MessageCheckQueueProducer(), new MessageCheckQueueConsumer(), queueName);
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
     * получает сообщение от добавляет его в массив redis
     * при разрешении отправляет в vk-queue и удаляет их из массива redis, если в массиве redis больше 100 сообщений
     *
     */
    public async addConsumer() {
        this.consumer.consume(async (message) => {
            if (message) {
                this.dateLastMessage = new Date();

                const content: MessageDto = JSON.parse(message.content.toString()).payload;

                console.log('check', content);

                const setName = `message_set-${content.vk_group_id}`;

                const permit = this.localStorage.getVkQueuePermit(`${VK_QUEUE_}${content.vk_group_id}`);

                if (permit === true) {
                    const messages = await this.redisProvider.smembers(setName);

                    if (messages && messages.length > 100) {

                        const messages = await this.redisProvider.spop(setName, 100);

                        this.worker.pushToVkQueue(messages.map((message: any) => JSON.parse(message)));
                    }
                }

                this.redisProvider.sadd(setName, JSON.stringify(content));
            }

            setTimeout(() => {
                this.ackMessage(<amqp.Message>message);
            }, 1);

        }, { noAck: false, consumerTag: `consumer-group-${1}` });
    }
}
