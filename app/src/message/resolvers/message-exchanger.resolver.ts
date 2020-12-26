// Resolers
import { GroupQueueResolver } from '../../group/resolvers';
import { BaseQueueResolver } from '../../shared/resolvers';
// Consumers
import { MessageExchangerQueueConsumer } from "../consumers";
// Producers
import { MessageExchangerQueueProducer } from "../porducers";
// Workers
import { GroupWorker } from '../../group/workers/group.worker';
import { MessageCheckWorker } from '../workers/message-check.worker';
import { MessageCheckQueueResolver } from './message-check.resolver';

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
     * @param {string} queueName - название очереди
     */
    public addConsumer(queueName: string): void {
        this.consumer.consume(queueName, async (message: any) => {
            if (message) {

                const content = JSON.parse(message.content.toString());

                const queues = await this.getQueuesList();

                const isQueueName = queues.includes(`message-check-${content.payload.group_id}`);

                if (isQueueName) {
                    console.log('is');
                    const worker = new MessageCheckWorker();

                    worker.setRabbitProvider(this.getRabbitProvider());
            
                    const resolver = new MessageCheckQueueResolver(`message-check-${content.payload.group_id}`);
            
                    resolver.setRabbitProvider(this.getRabbitProvider());
                    resolver.setServerId(0);
                    resolver.setMessageWorker(worker);
                    await resolver.start();
                    resolver.publishMessage(content.payload);
                }
                else {
                    console.log('no');
                    const worker = new GroupWorker();

                    worker.setRabbitProvider(this.getRabbitProvider());
            
                    const resolver = new GroupQueueResolver();
            
                    resolver.setRabbitProvider(this.getRabbitProvider());
                    resolver.setServerId(0);
                    resolver.setMessageWorker(worker);
                    await resolver.start();
                    resolver.publishMessage(content.payload);
                }
            }
        }, { noAck: true });
    }
}