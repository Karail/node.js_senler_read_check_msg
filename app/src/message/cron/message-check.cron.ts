// Cron
import { BaseCron } from "../../shared/cron";
// Jobs
import { MESSAGE_CHECK_ } from "../queues/resolvers/message-check.resolver";
import { VK_QUEUE_ } from "../../vk/queues/resolvers/vk-queue.resolver";
// Wrokers
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

        console.log(`timer check [${MESSAGE_CHECK_}${this.keyPrefix}]`);

        const permit = this.localStorage.getVkQueuePermit(`${VK_QUEUE_}${this.keyPrefix}`);

        console.log('JOB',permit);

        if (permit === true) {

            const setName = `message_set-${this.keyPrefix}`;

            const messages = await this.redisProvider.smembers(setName);

            console.log('JOB messages',messages,messages.length < 100 && messages.length > 0);

            if (messages.length < 100 && messages.length > 0) {

                const messages = await this.redisProvider.spop(setName, 100);



                this.worker.pushToVkQueue(messages.map((message) => JSON.parse(message)));
            }
        }
        else {
            console.log('нет разрешения на пуш в vk-queue');
        }
    }
}
