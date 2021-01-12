// Cron
import { BaseCron } from "../../shared/cron";

export class MessageVkQueueCheckCron extends BaseCron {

    /**
     * Разрешение на проверку очереди
     */
    private isUpdateFlag = true;

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
        console.log(`timer check vk-queue-${this.keyPrefix}`);

        if (this.isUpdateFlag) {

            const permit = await this.checkVkQueue();
        
            if (permit) {
                console.log('push vk-queue');
                this.redisPubProvider.set('vk-queue-permit', 'true');
            }
            else {
                console.log('limit vk-queue');
                this.redisPubProvider.set('vk-queue-permit', 'false');
                this.isUpdateFlag = false;
                setTimeout(() => {
                    this.isUpdateFlag = true;
                }, Number(process.env.DELAY_MESSAGE_VK_QUEUE_CHECK_LIMIT));
            }
        }
    }

    private async checkVkQueue(): Promise<boolean> {
        return true;
    }
}