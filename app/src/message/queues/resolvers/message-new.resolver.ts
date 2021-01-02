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

export class MessageNewQueueResolver extends BaseQueueResolver {

    constructor(
        public readonly queueName: string,
        public readonly keyPrefix: string = '',
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

    public addConsumer(): void {
        this.consumer.consume(async (message: any) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

                console.log('new', content);

                const queues = await this.getQueuesList();

                const isQueue = queues
                    .map((item) => item.name)
                    .includes(`message-check-${content.payload.group_id}`);

                if (!isQueue) {
                    console.log('no');

                    const resolver = await this.queueService.createQueue(
                        this.rabbitProvider,
                        new MessageCheckWorker(),
                        new MessageCheckQueueResolver(
                            `message-check-${content.payload.group_id}`, 
                            this.keyPrefix, 
                            this.exchangeName
                        ),
                        0,
                        this.redisPubProvider,
                        this.redisSubProvider
                    );
                    resolver.sendToQueue(content.payload);
                }
                else {
                    console.log('is');
                }
            }
        }, { noAck: true });
    }
}