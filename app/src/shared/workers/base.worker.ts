// Rabbitmq
import { Rabbit } from "../rabbit";

export class BaseQueueWorker {

    /**
     * экземпляр брокера
     */
    private rabbitWorker!: Rabbit;

    public setRabbitProvider(rabbitWorker: Rabbit) {
        this.rabbitWorker = rabbitWorker;
    }

}