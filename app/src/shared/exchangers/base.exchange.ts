import amqp from 'amqplib';
// Brokers
import { Rabbit } from '../rabbit';

export class BaseExchange {

    /**
     * Инстанс брокера
     */
    public rabbitProvider!: Rabbit;


    constructor(
        private exchangeName: string,
        private exchangeType: string = 'x-delayed-message',

    ) { }

    /**
     * Setter rabbitProvider
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Инициализирующий метод модуля
     */
    async start(): Promise<void> {
        await this.rabbitProvider.createChannel(this.exchangeName);
    }

    /**
     * Getter exchangeName
     */
    getExchangeName(): string {
        return `${this.exchangeName}`;
    }

    /**
     * Создать обменник
     * @param {amqp.Options.AssertExchange} options - Конфигурация обменника
     */
    async assertExchange(
        options: amqp.Options.AssertExchange = {
            autoDelete: false,
            durable: false,
            // passive: true,
            arguments: { 'x-delayed-type': 'direct' }
        }
    ): Promise<amqp.Replies.AssertExchange | undefined> {
        return this.rabbitProvider.assertExchange(this.exchangeName, this.exchangeType, options);
    }

    /**
     * Опубликовать сообщение в обменник
     * @param {string} queueName - Название очереди
     * @param {any} message - Сообщение
     * @param {amqp.Options.Publish} options - Конфигурация сообщения
     */
    publish(queueName = '', message: any, options?: amqp.Options.Publish): boolean | undefined {
        return this.rabbitProvider.publish(this.exchangeName, JSON.stringify(message), queueName, options);
    }
}