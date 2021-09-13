// Resolvers
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { VkQueueConsumer } from '../consumers';
// Producers
import { VkQueueProducer } from '../producers';
// Workers
import { VkQueueWorker } from '../workers';
import amqp from "amqplib";

export const VK_QUEUE_ = 'vk_';

export class VkQueueResolver extends BaseQueueResolver {

    public readonly worker!: VkQueueWorker;

    constructor(
        public readonly queueName: string,
        public readonly exchangeName: string = '',
    ) {
        super(new VkQueueProducer({ durable: false, maxPriority: 10 }), new VkQueueConsumer(), queueName);
    }

    /**
     * Отправка сообщения в очередь
     * @param {any} payload - Cообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди
     */
    public sendToQueue(payload: any, options?: amqp.Options.Publish): void {
        this.producer.sendToQueue(payload, options);
    }
}
