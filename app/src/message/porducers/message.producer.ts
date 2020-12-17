import * as amqp from 'amqplib';
// Rabbit
import { Rabbit } from "src/shared/rabbit";

export class MessageQueueProducer {

    private rabbitProvider!: Rabbit;
    private consumer!: any;

    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Инициализирующий метод модуля
     */
    public async start(): Promise<void> {
        await this.rabbitProvider.createChannel();
        console.log('MESSAGE: 3.Create rabbit producer channel');
    }

    /**
     * Создание очереди, если ее не существует и получение дополнительных параметров по очереди
     * - Количество сообщений
     * - Количество получателей (consumer)
     * @param {string} queueName - название очереди
     */
    public async assertQueue(queueName: string): Promise<amqp.Replies.AssertQueue> {
        try {
            const ok = await this.rabbitProvider.assertQueue(queueName, {
                durable: false, maxPriority: 10
            });
            return ok;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }
    
    /**
     * Отправка сообщения в очередь
     * @param {string} queueName - название очереди
     * @param {string} message - сообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди, default = { persistent: true }
     */
    public publishMessage(queueName: string, message: any, options?: amqp.Options.Publish): void {
        this.rabbitProvider.publishMessage(queueName, JSON.stringify(message), options);
    }
}