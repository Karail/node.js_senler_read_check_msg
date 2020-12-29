// Resolvers
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { MessageCheckQueueConsumer } from '../consumers';
// Producers
import { MessageCheckQueueProducer } from '../producers';

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageCheckQueueResolver extends BaseQueueResolver {

    constructor(
        public exchangeName = '',
        public keyPrefix = 'message-check'
    ) {
        super(new MessageCheckQueueProducer(), new MessageCheckQueueConsumer(), keyPrefix);
    }

    async start() {
        await super.start();
        await this.rabbitProvider.bindQueue(
            this.exchangeName,
            this.keyPrefix,
            this.exchangeName,
        );
    }

    /**
     * Добавляет потребителя для сообщений очереди queueName
     * @param {string} queueName - Название очереди
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