// Interfaces
import { QueueInterface as Queue } from "./interfaces";


/**
 * Стейт для хранения и обработки глобальной информации
 */
export class LocalStorage {

    /**
     * Список очередей
     */
    private readonly queues: Map<string, Queue> = new Map();
    /**
     * Список флагов разрешающих отправку в vk-queue
     */
    private readonly vkQueuePermits: Map<string, boolean> = new Map();

    /**
     *  Setter vkQueuePermits
     * @param {Queue} queue - очередь и список cron
     */
    public setVkQueuePermit(queueName: string, permit: boolean) {
        console.log('.setVkQueuePermit ' , queueName );
        return this.vkQueuePermits.set(queueName, permit);
    }

    /**
     * Getter vkQueuePermits
     * @param {string} queueName - Имя очереди
     */
    public getVkQueuePermit(queueName: string) {
        console.log('.getVkQueuePermit ' , queueName ,this.vkQueuePermits);
        return this.vkQueuePermits.get(queueName);
    }

    /**
     *  Setter queues
     * @param {Queue} queue - очередь и список cron
     */
    public setQueue(queue: Queue) {
        return this.queues.set(queue.resolver.queueName, queue);
    }

    /**
     * Getter queue
     * @param {string} queueName - Имя очереди
     */
    public getQueue(queueName: string) {
        return this.queues.get(queueName);
    }

    /**
     * Getter queue
     * @param {string} queueName - Имя очереди
     */
    public getAllQueues() {
        return this.queues;
    }

    /**
     * Delete queue
     * @param {string} queueName - Имя очереди
     */
    public deleteQueue(queueName: string) {
        const queue = this.queues.get(queueName);
        queue?.resolver?.deleteQueue();
        queue?.crons?.forEach((cron) => {
            cron.remove();
        });
        return this.queues.delete(queueName);
    }
}
