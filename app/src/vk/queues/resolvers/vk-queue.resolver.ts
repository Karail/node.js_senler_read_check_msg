// Resolvers
import { BaseQueueResolver } from '../../../shared/resolvers';
// Consumers
import { VkQueueConsumer } from '../consumers';
// Producers
import { VkQueueProducer } from '../producers';
// Workers
import { VkQueueWorker } from '../workers';

export const VK_QUEUE_ = 'vk-queue-';

export class VkQueueResolver extends BaseQueueResolver {

    public readonly worker!: VkQueueWorker;

    constructor(
        public readonly queueName: string,
        public readonly exchangeName: string = '',
    ) {
        super(new VkQueueProducer({ durable: false }), new VkQueueConsumer(), queueName);
    }
}