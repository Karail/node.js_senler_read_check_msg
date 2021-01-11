import amqp from 'amqplib';
// Resolvers
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { MessageCheckQueueConsumer } from '../consumers';
// Producers
import { MessageCheckQueueProducer } from '../producers';
// Services
import { Logger } from '../../../shared/services';

export class MessageCheckQueueResolver extends BaseQueueResolver {

    constructor(
        public readonly queueName: string,
        public readonly keyPrefix: string = '',
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

    public async addConsumer() {
        this.consumer.consume(async (message) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

                console.log('check', content);

                const setName = `message_set-${content.group_id}`;

                const messages = await this.redisPubProvider?.smembers(setName);

                if (messages && messages.length > 100) {
                    const messages = await this.redisPubProvider?.spop(setName);
                    console.log(messages);
                }

                this.redisPubProvider?.sadd(setName, JSON.stringify(content.payload));
            }

            setTimeout(() => {
                this.ackMessage(<amqp.Message>message);
            }, 1);

        }, { noAck: false, consumerTag: `consumer-group-${1}` });
    }
}