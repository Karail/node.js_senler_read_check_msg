// Resolvers
import { group } from "console";
import { BaseQueueResolver } from "../../shared/resolvers";
// Consumers
import { MessageCheckQueueConsumer } from "../consumers";
// Producers
import { MessageCheckQueueProducer } from "../porducers";

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageCheckQueueResolver extends BaseQueueResolver {

    constructor(keyPrefix = 'message-check') {
        super(new MessageCheckQueueProducer(), new MessageCheckQueueConsumer(), keyPrefix);
    }

    /**
     * Добавляет потребителя для сообщений очереди queueName
     * @param {string} queueName - название очереди
     */
    public async addConsumer(queueName: string) {
        this.consumer.consume(queueName, (message) => {
            if (message) {

                const content = JSON.parse(message.content.toString());
                console.log(content);
            }

        }, { noAck: true, consumerTag: `consumer-group-${1}` });
    }
}