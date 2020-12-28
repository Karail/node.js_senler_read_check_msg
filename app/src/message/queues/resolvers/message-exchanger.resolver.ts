// Resolers
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { MessageExchangerQueueConsumer } from "../consumers";
// Producers
import { MessageExchangerQueueProducer } from "../porducers";
// Workers
import { MessageNewWorker } from '../workers';
import { MessageCheckWorker } from '../workers';
// Resolvers
import { MessageCheckQueueResolver } from './message-check.resolver';
import { MessageNewQueueResolver } from './message-new.resolver';

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageExchangerQueueResolver extends BaseQueueResolver {

    constructor(keyPrefix = 'message-exchanger') {
        super(new MessageExchangerQueueProducer(), new MessageExchangerQueueConsumer(), keyPrefix);
    }

    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} queueName - Название очереди
     */
    public addConsumer(queueName: string): void {
        this.consumer.consume(queueName, async (message: any) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

                const queues = await this.getQueuesList();

                const isQueueName = queues
                                        .map((item) => item.name)
                                        .includes(`message-check-${content.payload.group_id}`);

                if (isQueueName) {
                    console.log('is');

                    const resolver = await this.queueService.createQueue(
                        this.getRabbitProvider(),
                        new MessageCheckWorker(),
                        new MessageCheckQueueResolver(`message-check-${content.payload.group_id}`),
                        0
                    );

                    resolver.publishMessage(content.payload);
                }
                else {
                    console.log('no');

                    const resolver = await this.queueService.createQueue(
                        this.getRabbitProvider(),
                        new MessageNewWorker(),
                        new MessageNewQueueResolver(),
                        0
                    );
                 
                    resolver.publishMessage(content.payload);
                }
            }
        }, { noAck: true });
    }
}