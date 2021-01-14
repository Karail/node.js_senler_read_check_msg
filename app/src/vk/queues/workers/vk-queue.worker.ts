// Workers
import { BaseQueueWorker } from '../../../shared/workers/base.worker';

export class VkQueueWorker extends BaseQueueWorker {
    /**
     * Проверка можно ли отпарвлять сообщения в vk-queue
     */
    public async checkVkQueue(): Promise<Map<string, boolean>> {
        const result = new Map();
        result.set('vk-queue-1', true);
        result.set('vk-queue-2', false);
        return result;
    }
}