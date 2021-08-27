// Workers
import { BaseQueueWorker } from '../../../shared/workers/base.worker';
// Jobs
import { VK_QUEUE_ } from '../resolvers/vk-queue.resolver';

export class VkQueueWorker extends BaseQueueWorker {
    /**
     * Проверка можно ли отпарвлять сообщения в vk-queue
     */
    public async checkVkQueue(): Promise<Map<string, boolean>> {

        const queues = await this.rabbitProvider.getQueuesList(1, VK_QUEUE_);

        const result = new Map();
        // queue.message_bytes_unacknowledged  < 100000
        queues.forEach((queue) => {
            result.set(queue.name, true);
        });

        return result;
    }
}