import * as amqp from 'amqplib';
// Rabbit
import { Rabbit } from "../rabbit";
// Logger
import { Logger } from '../services';

export class BaseQueueConsumer {

    /**
     * Ссылка на инстанс Rabbitmq
     */
    private rabbitProvider!: Rabbit
    /**
     * Префикс для именования очередей
     */
    private keyPrefix!: string;

    setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    setKeyPrefix(keyPrefix: string) {
        this.keyPrefix = keyPrefix;
    }

    /**
     * Инициализирующий метод модуля
     */
    async start(): Promise<void> {
        await this.rabbitProvider.createChannel(this.keyPrefix);
        Logger.info('3.Create rabbit consume channel');
    }

    /**
     * Создание потребяителя для очереди
     * @param {string} queueName - Название очереди
     * @param {Function} callback - Коллбэк для обработки нового сообщения
     * @param {amqp.Options.Consume} options - Конфигурация консьюмера
     */
    consume(queueName: string, callback: (message: amqp.ConsumeMessage | null) => void, options: amqp.Options.Consume): void {
        this.rabbitProvider.consume(queueName, callback, options);
    }

    /**
     * отменяет прослушивание по тэгу
     * @param {string} queueName  - Название очереди
     * @param {string} consumerTag тэг прослушивателя
     */
    cancelConsuming(queueName = '', consumerTag: string): void {
        this.rabbitProvider.cancelConsuming(queueName, consumerTag);
    }

    /**
     * Подтвердить обработку сообщения
     * @param {string} queueName  - Название очереди
     * @param {amqp.Message} message
     */
    ackMessage(queueName = '', message: amqp.Message): void {
        this.rabbitProvider.ackMessage(queueName, message);
    }
}