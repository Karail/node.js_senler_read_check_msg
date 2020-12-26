// Resolers
import { BaseQueueResolver } from '../../shared/resolvers';
// Consumers
import { MessageThrowQueueConsumer } from "../consumers";
// Producers
import { MessageThrowQueueProducer } from "../porducers";

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageThrowQueueResolver extends BaseQueueResolver {

    constructor(keyPrefix = 'message-exchanger') {
        super(new MessageThrowQueueProducer(), new MessageThrowQueueConsumer(), keyPrefix);
    }

    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} queueName - название очереди
     */
    public addConsumer(queueName: string): void {
        this.consumer.consume(queueName, async (message: any) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

            }
        }, { noAck: true });
    }
}