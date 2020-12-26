// Resolers
import { MessageCheckQueueResolver } from '../../message/resolvers';
import { BaseQueueResolver } from '../../shared/resolvers';
// Consumers
import { GroupQueueConsumer } from '../consumers/group.consumer';
// Producers
import { GroupQueueProducer } from '../producers/group.producer';
// Workers
import { MessageCheckWorker } from '../../message/workers/message-check.worker';

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class GroupQueueResolver extends BaseQueueResolver {

    constructor() {
        super(new GroupQueueProducer(), new GroupQueueConsumer(), 'group-queue-creator');
    }

    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} queueName - название очереди
     */
    public addConsumer(queueName: string): void {
        this.consumer.consume(queueName, async (message: any) => {
            if (message) {
                const content = JSON.parse(message.content.toString());

                const worker = new MessageCheckWorker();

                worker.setRabbitProvider(this.getRabbitProvider());
        
                const resolver = new MessageCheckQueueResolver(`message-check-${content.payload.group_id}`);
        
                resolver.setRabbitProvider(this.getRabbitProvider());
                resolver.setServerId(0);
                resolver.setMessageWorker(worker);
                await resolver.start();
                resolver.publishMessage(content.payload);

            }
        }, { noAck: true });
    }
}