// Brokers
import { Rabbit } from '../rabbit';

export class BaseQueueWorker {

    /**
     * Инстанс брокера
     */
    private rabbitProvider!: Rabbit;

    /**
     * Setter брокера
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }
}