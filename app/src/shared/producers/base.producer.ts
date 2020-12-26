import * as amqp from 'amqplib';
// Rabbit
import { Rabbit } from "../../shared/rabbit";
// Logger
import { Logger } from '../services';

export class BaseQueueProducer {

    /**
     * Ссылка на инстанс Rabbitmq
     */
    private rabbitProvider!: Rabbit;
    private consumer!: any;
        /**
     * Префикс для именования очередей
     */
    private keyPrefix!: string;

    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    setKeyPrefix(keyPrefix: string) {
        this.keyPrefix = keyPrefix;
    }

    /**
     * Инициализирующий метод модуля
     */
    public async start(): Promise<void> {
        await this.rabbitProvider.createChannel(this.keyPrefix);
        Logger.info('2.Create rabbit producer channel');
    }

    /**
     * Создание очереди, если ее не существует и получение дополнительных параметров по очереди
     * - Количество сообщений
     * - Количество получателей (consumer)
     * @param {string} queueName - название очереди
     */
    public async assertQueue(queueName = '', options?: amqp.Options.AssertQueue)
    // : Promise<amqp.Replies.AssertQueue | undefined> 
    {
        return this.rabbitProvider.assertQueue(queueName, options);
    }

    /**
     * Отправка сообщения в очередь
     * @param {string} queueName - название очереди
     * @param {string} message - сообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди, default = { persistent: true }
     */
    public publishMessage(queueName = '', message: any, options?: amqp.Options.Publish): void {
        this.rabbitProvider.publishMessage(queueName, JSON.stringify(message), options);
    }
}