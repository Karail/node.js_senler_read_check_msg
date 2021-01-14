// Cron
import { BaseCron } from "../../shared/cron";
// Workers
import { VkQueueWorker } from "../../vk/queues/workers";

export class VkQueueCheckCron extends BaseCron {

    protected readonly worker!: VkQueueWorker;

    /**
     * Создание Задачи
     * @param {number} keyPrefix - Префикс уникальности
     * @param {number} delay - Задержка вызова
     */
    constructor(
        protected readonly keyPrefix: number,
        protected readonly delay: number = Number(process.env.DELAY_MESSAGE_VK_QUEUE_CHECK)
    ) {
        super();
    }

    /**
     * Разрешает или запрещает отправку в vk-queue, если в vk-queue больше 100 000 сообщений запрещает отправку на 10 минут
     */
    protected async job() {
        console.log(`timer check [vk-queue-*]`);

        const vkQueuePermits = await this.worker.checkVkQueue();
        
        vkQueuePermits.forEach((permit, queue) => {
            this.localStorage.setVkQueuePermit(queue, permit);
        });
    }
}