// Cron
import { BaseCron } from "../../shared/cron";
import { MessageCheckWorker } from "../queues/workers";

export class MessageCheckCron extends BaseCron {

    protected readonly worker!: MessageCheckWorker;
    /**
     * Создание Задачи
     * @param {number} keyPrefix - Префикс уникальности
     * @param {number} delay - Задержка вызова
     */
    constructor(
        protected readonly keyPrefix: number,
        protected readonly delay: number = Number(process.env.DELAY_MESSAGE_CHECK)
    ) {
        super();
    }

    /**
     * при разрешении отправляет в vk-queue и удаляет их из массива redis, если в массиве redis меньше 100 сообщений
     */
    protected async job() {

        console.log(`timer check ${this.keyPrefix}`);

        const permit = await this.redisPubProvider.get('vk-queue-permit');
        
        if (permit === 'true') {

            const setName = `message_set-${this.keyPrefix}`;

            const messages = await this.redisPubProvider.smembers(setName);

            if (messages.length < 100 && messages.length > 0) {

                const messages = await this.redisPubProvider.spop(setName, 100);

                this.worker.pushToVkQueue(messages.map((message) => JSON.parse(message)));
            }
        }
    }
}