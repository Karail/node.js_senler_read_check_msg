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
import { MessageDto } from 'src/message/dto';
// Workers
import { MessageCheckWorker } from '../workers';

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

                const content: MessageDto = JSON.parse(message.content.toString()).payload;

                console.log('check', content);

                const setName = `message_set-${content.group_id}`;

                const permit = await this.redisPubProvider.get('vk-queue-permit');

                if (permit === 'true') {
                    const messages = await this.redisPubProvider.smembers(setName);

                    if (messages && messages.length > 100) {

                        const messages = await this.redisPubProvider.spop(setName, 100);

                        this.worker.pushToVkQueue(messages.map((message) => JSON.parse(message)));
                    }
                }

                this.redisPubProvider.sadd(setName, JSON.stringify(content));
            }

            setTimeout(() => {
                this.ackMessage(<amqp.Message>message);
            }, 1);

        }, { noAck: false, consumerTag: `consumer-group-${1}` });
    }
}