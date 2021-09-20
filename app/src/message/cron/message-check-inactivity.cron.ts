// Cron
import { BaseCron } from "../../shared/cron";
// Workers
import { MessageCheckInactivityWorker } from "../queues/workers";

export class MessageCheckInactivityCron extends BaseCron {

    protected readonly worker!: MessageCheckInactivityWorker;
    /**
     * Создание Задачи
     * @param {number} keyPrefix - Префикс уникальности
     * @param {number} delay - Задержка вызова
     */
    constructor(
        protected readonly keyPrefix: number,
        protected readonly delay: number = Number(process.env.DELAY_MESSAGE_CHECK_INACTIVITY)
    ) {
        super();
    }

    /**
     * при разрешении отправляет в vk-queue и удаляет их из массива redis, если в массиве redis меньше 100 сообщений
     */
    protected async job() {
        console.log(`timer check [*]`);

        let now = new Date();

        const queues = this.localStorage.getAllQueues();

        queues.forEach((queue) => {


            if (
            now.getTime() - queue.resolver.dateLastMessage.getTime() > queue.resolver.expiredLimit
            ) {
                this.localStorage.deleteQueue(queue.resolver.queueName);

                console.log(`delete queue [${queue.resolver.queueName}]`);
            }
        });
    }
}
