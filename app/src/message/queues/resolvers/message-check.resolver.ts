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
        public readonly queueName: string,
        public readonly keyPrefix: string = '',
        public readonly exchangeName: string = '',
    ) {
        super(new MessageCheckQueueProducer(), new MessageCheckQueueConsumer(), queueName);
    }

    async start() {
        await super.start();
        await this.rabbitProvider.bindQueue(
            this.exchangeName,
            this.queueName,
            this.exchangeName,
        );
    }

    /**
     * Добавляет потребителя для сообщений очереди queueName
     */
    public async addConsumer() {
        this.consumer.consume((message) => {
            if (message) {

                const content = JSON.parse(message.content.toString());
                console.log('check ',content);
            }

        }, { noAck: true, consumerTag: `consumer-group-${1}` });
    }
}