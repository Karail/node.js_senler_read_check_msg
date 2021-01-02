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
        this.consumer.consume((message) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

                console.log('check', content);

                this.redisSubProvider?.subscribe('messages-queue', (err) => {
                    if (err) {
                        Logger.error(err.message);
                        throw err;
                    }
                    this.redisPubProvider?.publish('messages-queue', JSON.stringify(content.payload));
                    this.redisPubProvider?.sadd('message_set', JSON.stringify(content.payload));
                });
            }

        }, { noAck: true, consumerTag: `consumer-group-${1}` });
    }
}