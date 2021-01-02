import * as amqp from 'amqplib';
// Queues
import { Rabbit } from '../queues';
// Services
import { Logger } from '../services';

export class BaseQueueConsumer {

    /**
     * Инстанс Rabbitmq
     */
    private rabbitProvider!: Rabbit
    /**
     * Имя очереди
     */
    private queueName!: string;
    /**
     * Setter брокера
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Setter queueName
     * @param {string} queueName - Имя очереди
     */
    public setQueueName(queueName: string) {
        this.queueName = queueName;
    }

    /**
     * Инициализирующий метод модуля
     */
    public async start(): Promise<void> {
        try {
            await this.rabbitProvider.createChannel(this.queueName);
            Logger.info(`[${this.queueName}] 2.Create rabbit consume channel`);
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    /**
     * Создание потребяителя для очереди
     * @param {Function} callback - Коллбэк для обработки нового сообщения
     * @param {amqp.Options.Consume} options - Конфигурация консьюмера
     */
    public consume(callback: (message: amqp.ConsumeMessage | null) => void, options: amqp.Options.Consume): void {
        this.rabbitProvider.consume(this.queueName, callback, options);
    }

    /**
     * Отменяет прослушивание по тэгу
     * @param {string} consumerTag тэг прослушивателя
     */
    public cancelConsuming(consumerTag: string): void {
        this.rabbitProvider.cancelConsuming(this.queueName, consumerTag);
    }

    /**
     * Подтвердить обработку сообщения
     * @param {amqp.Message} message
     */
    public ackMessage(message: amqp.Message): void {
        this.rabbitProvider.ackMessage(this.queueName, message);
    }
}