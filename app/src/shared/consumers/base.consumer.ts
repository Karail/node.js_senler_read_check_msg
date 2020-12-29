import * as amqp from 'amqplib';
// Brokers
import { Rabbit } from '../rabbit';
// Services
import { Logger } from '../services';

export class BaseQueueConsumer {

    /**
     * Инстанс Rabbitmq
     */
    private rabbitProvider!: Rabbit
    /**
     * Префикс для именования очередей
     */
    private keyPrefix!: string;

    /**
     * Setter брокера
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Setter префиксa для именования очередей
     * @param {string} keyPrefix - Префикс для именования очередей
     */
    public setKeyPrefix(keyPrefix: string) {
        this.keyPrefix = keyPrefix;
    }

    /**
     * Инициализирующий метод модуля
     */
    public async start(): Promise<void> {
        await this.rabbitProvider.createChannel(this.keyPrefix);
        Logger.info(`[${this.keyPrefix}] 2.Create rabbit consume channel`);
    }

    /**
     * Создание потребяителя для очереди
     * @param {string} queueName - Название очереди
     * @param {Function} callback - Коллбэк для обработки нового сообщения
     * @param {amqp.Options.Consume} options - Конфигурация консьюмера
     */
    public consume(queueName: string, callback: (message: amqp.ConsumeMessage | null) => void, options: amqp.Options.Consume): void {
        this.rabbitProvider.consume(queueName, callback, options);
    }

    /**
     * Отменяет прослушивание по тэгу
     * @param {string} queueName  - Название очереди
     * @param {string} consumerTag тэг прослушивателя
     */
    public cancelConsuming(queueName = '', consumerTag: string): void {
        this.rabbitProvider.cancelConsuming(queueName, consumerTag);
    }

    /**
     * Подтвердить обработку сообщения
     * @param {string} queueName  - Название очереди
     * @param {amqp.Message} message
     */
    public ackMessage(queueName = '', message: amqp.Message): void {
        this.rabbitProvider.ackMessage(queueName, message);
    }
}