import * as amqp from 'amqplib';
// Brokers
import { Rabbit } from '../../shared/rabbit';
// Consumer
import { BaseQueueConsumer } from '../consumers';
// Services
import { Logger } from '../services';

export class BaseQueueProducer {

    /**
     * Инстанс брокера
     */
    private rabbitProvider!: Rabbit;
    /**
     * Инстанс Consumer
     */
    private consumer!: BaseQueueConsumer;
    /**
     * Префикс для именования очередей
     */
    private keyPrefix!: string;

    /**
     * Setter rabbitProvider
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit) {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Setter keyPrefix
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
        Logger.info(`[${this.keyPrefix}] 1.Create rabbit producer channel`);
    }

    /**
     * Создание очереди, если ее не существует и получение дополнительных параметров по очереди
     * - Количество сообщений
     * - Количество получателей (consumer)
     * @param {string} queueName - Название очереди
     */
    public async assertQueue(queueName = '', options?: amqp.Options.AssertQueue): Promise<amqp.Replies.AssertQueue | undefined> {
        return this.rabbitProvider.assertQueue(queueName, options);
    }

    /**
     * Отправка сообщения в очередь
     * @param {string} queueName - Название очереди
     * @param {string} message - сообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди, default = { persistent: true }
     */
    public publishMessage(queueName = '', message: any, options?: amqp.Options.Publish): void {
        this.rabbitProvider.publishMessage(queueName, JSON.stringify(message), options);
    }
}