// Resolvers
import { MessageCheckQueueResolver } from '../resolvers';
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { MessageNewQueueConsumer } from '../consumers';
// Producers
import { MessageNewQueueProducer } from '../producers';
// Workers
import { MessageCheckWorker } from '../workers';

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageNewQueueResolver extends BaseQueueResolver {

    constructor(
        public exchangeName = '',
        public keyPrefix = 'message-new'
    ) {
        super(new MessageNewQueueProducer(), new MessageNewQueueConsumer(), keyPrefix);
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
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} queueName - Название очереди
     */
    public addConsumer(queueName: string): void {
        this.consumer.consume(queueName, async (message: any) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

                console.log(content);

                const queues = await this.getQueuesList();

                const isQueueName = queues
                    .map((item) => item.name)
                    .includes(`message-check-${content.payload.group_id}`);

                if (isQueueName) {
                    console.log('is');
                }
                else {
                    console.log('no');
                    const resolver = await this.queueService.createQueue(
                        this.getRabbitProvider(),
                        new MessageCheckWorker(),
                        new MessageCheckQueueResolver(`message-check-${content.payload.group_id}`),
                        0
                    );
                }
            }
        }, { noAck: true });
    }
}