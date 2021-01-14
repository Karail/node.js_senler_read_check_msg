// Queues
import { Rabbit } from '../queues';

export class BaseQueueWorker {

    /**
     * Инстанс брокера
     */
    protected rabbitProvider!: Rabbit;

    /**
     * Setter брокера
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }
}