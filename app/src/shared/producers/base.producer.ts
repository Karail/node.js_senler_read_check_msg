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
     * Имя очереди
     */
    private queueName!: string;

    /**
     * Setter rabbitProvider
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit) {
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
        await this.rabbitProvider.createChannel(this.queueName);
        Logger.info(`[${this.queueName}] 1.Create rabbit producer channel`);
    }

    /**
     * Создание очереди, если ее не существует и получение дополнительных параметров по очереди
     * - Количество сообщений
     * - Количество получателей (consumer)
     */
    public async assertQueue(options?: amqp.Options.AssertQueue): Promise<amqp.Replies.AssertQueue | undefined> {
        return this.rabbitProvider.assertQueue(this.queueName, options);
    }

    /**
     * Отправка сообщения в очередь
     * @param {string} message - сообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди, default = { persistent: true }
     */
    public publishMessage(message: any, options?: amqp.Options.Publish): void {
        this.rabbitProvider.publishMessage(this.queueName, message, options);
    }
}