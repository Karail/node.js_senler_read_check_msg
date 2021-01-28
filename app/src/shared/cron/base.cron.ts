import { Db } from 'mongodb';
// Databases
import { Redis } from '../database';
// Workers
import { BaseQueueWorker } from "../workers";
// Storage
import { LocalStorage } from "../../local-storage";

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
     * Инстанс redis
     */
    protected redisProvider!: Redis;
    /**
     * Инстанс Worker
     */
    protected worker!: BaseQueueWorker;
    /**
     * Инстанс хранилища
     */
    protected localStorage!: LocalStorage;
    /**
     * Инстанс Mongo
     */
    protected mongoProvider!: Db;

    /**
     * Setter mongoProvider
     * @param {Rabbit} mongoProvider - Инстанс Mongo
     */
    public setMongoProvider(mongoProvider: Db): void {
        this.mongoProvider = mongoProvider;
    }

    /**
     * Setter localStorage
     * @param {LocalStorage} localStorage - Инстанс хранилища
     */
    public setLocalStorage(localStorage: LocalStorage): void {
        this.localStorage = localStorage;
    }

    /**
     * Setter redisProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisProvider(redisProvider: Redis): void {
        this.redisProvider = redisProvider;
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
            this.timeout = setTimeout(run.bind(this), this.delay);
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