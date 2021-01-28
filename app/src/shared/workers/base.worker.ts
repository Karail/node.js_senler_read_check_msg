import { Db } from 'mongodb';
// Queues
import { Rabbit } from '../queues';

export class BaseQueueWorker {

    /**
     * Инстанс брокера
     */
    protected rabbitProvider!: Rabbit;
    /**
     * Инстанс Mongo
     */
    protected mongoProvider!: Db;

    /**
     * Setter брокера
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Setter mongoProvider
     * @param {Rabbit} mongoProvider - Инстанс Mongo
     */
    public setMongoProvider(mongoProvider: Db): void {
        this.mongoProvider = mongoProvider;
    }
}