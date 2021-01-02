// Queues
import IORedis from "ioredis";
import { Redis } from "../queues";

export class BaseRedisConsumer {
    /**
     * Инстанс redis pub
     */
    protected redisPubProvider!: Redis;
    /**
     * Инстанс redis sub
     */
    protected redisSubProvider!: Redis;

    constructor(protected readonly key: string[]) { }

    /**
     * Setter redisPubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisPubProvider(redisProvider: Redis) {
        this.redisPubProvider = redisProvider;
    }
    /**
     * Setter redisSubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisSubProvider(redisProvider: Redis) {
        this.redisSubProvider = redisProvider;
    }

    /**
     * Метод инициализации
     */
    public async start() {
        this.addConsumer();
    }

    /**
     * Добавляет потребителя для сообщений очереди
     */
    protected addConsumer() {

    }

    /**
     * Создание потребяителя для очереди
     * @param {Function} callback - Коллбэк для обработки нового сообщения
     */
    protected consume<T>(listener: (...args: any[]) => void) {
        this.redisSubProvider.on('message', listener)
    }
}