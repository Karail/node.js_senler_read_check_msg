// Resolers
import { MessageCheckQueueResolver } from '../resolvers';
import { BaseQueueResolver } from '../../shared/resolvers';
// Consumers
import { MessageNewQueueConsumer } from '../consumers';
// Producers
import { MessageNewQueueProducer } from '../porducers';
// Workers
import { MessageCheckWorker } from '../workers';

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageNewQueueResolver extends BaseQueueResolver {

    constructor(keyPrefix = 'message-new') {
        super(new MessageNewQueueProducer(), new MessageNewQueueConsumer(), keyPrefix);
    }

    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} queueName - Название очереди
     */
    public addConsumer(queueName: string): void {
        this.consumer.consume(queueName, async (message: any) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

                const resolver = await this.queueService.createQueue(
                    this.getRabbitProvider(),
                    new MessageCheckWorker(),
                    new MessageCheckQueueResolver(`message-check-${content.payload.group_id}`),
                    0
                );

                resolver.publishMessage(content.payload);
            }
        }, { noAck: true });
    }
}