// Queues
import { Redis } from "../queues";
// Workers
import { BaseQueueWorker } from "../workers";

export class BaseCron {

    /**
     * Инстанс Cron
     */
    protected timeout!: NodeJS.Timeout
    /**
     * Задержка вызова
     */
    protected readonly delay!: number;
    /**
     * Инстанс redis pub
     */
    protected redisPubProvider!: Redis;
    /**
     * Инстанс redis sub
     */
    protected redisSubProvider!: Redis;
    /**
     * Инстанс Worker
     */
    protected worker!: BaseQueueWorker;


    /**
     * Setter redisPubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisPubProvider(redisProvider: Redis): void {
        this.redisPubProvider = redisProvider;
    }

    /**
     * Setter redisSubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisSubProvider(redisProvider: Redis): void {
        this.redisSubProvider = redisProvider;
    }

    /**
     * Setter worker
     * @param {BaseQueueWorker} worker - Инстанс Worker
     */
    public setWorker(worker: BaseQueueWorker): void {
        this.worker = worker;
    }
    
    /**
     * Старт Cron
     */
    public start(): void {
        this.timeout = setTimeout(run.bind(this), this.delay);

        function run(this: BaseCron) {
            this.job();
            setTimeout(run.bind(this), this.delay);
        }
    }

    /**
     * Убить задачу
     */
    public remove(): void {
        clearTimeout(this.timeout);
    }

    /**
     * Бизнес-логика задачи
     */
    protected job(): void {

    }
}