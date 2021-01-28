import amqp from 'amqplib';
// Queues
import { Rabbit } from '../queues';
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

    constructor(
        /**
         * Конфигурация создания очереди
         */
        private readonly assertQueueoptions: amqp.Options.AssertQueue = { durable: false }
    ) {
        
    }

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
        try {
            await this.rabbitProvider.createChannel(this.queueName);
            Logger.info(`[${this.queueName}] 1.Create rabbit producer channel`);
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    /**
     * Создание очереди, если ее не существует и получение дополнительных параметров по очереди
     * - Количество сообщений
     * - Количество получателей (consumer)
     */
    public async assertQueue(): Promise<amqp.Replies.AssertQueue | undefined> {
        return this.rabbitProvider.assertQueue(this.queueName, this.assertQueueoptions);
    }

    /**
     * Отправка сообщения в очередь
     * @param {string} message - сообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди, default = { persistent: true }
     */
    public sendToQueue(message: any, options?: amqp.Options.Publish): void {
        this.rabbitProvider.sendToQueue(this.queueName, message, options);
    }
}