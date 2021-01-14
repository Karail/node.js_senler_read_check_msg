import amqp from 'amqplib';
// Queues
import { Rabbit } from '../queues';

export class BaseExchange {

    /**
     * Инстанс брокера
     */
    public rabbitProvider!: Rabbit;

    constructor(
        public readonly exchangeName: string,
        public readonly exchangeType: string,
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
    public async start(): Promise<void> {
        await this.rabbitProvider.createChannel(this.exchangeName);
    }

    /**
     * Getter exchangeName
     */
    public getExchangeName(): string {
        return `${this.exchangeName}`;
    }

    /**
     * Создать обменник
     * @param {amqp.Options.AssertExchange} options - Конфигурация обменника
     */
    public async assertExchange(
        options?: amqp.Options.AssertExchange): Promise<amqp.Replies.AssertExchange | undefined> {
        return this.rabbitProvider.assertExchange(this.exchangeName, this.exchangeType, options);
    }

    /**
     * Опубликовать сообщение в обменник
     * @param {string} queueName - Имя очереди
     * @param {any} payload - Сообщение
     * @param {amqp.Options.Publish} options - Конфигурация сообщения
     */
    public publish(queueName = '', payload: any, options?: amqp.Options.Publish): boolean | undefined {
        return this.rabbitProvider.publish(this.exchangeName, { payload }, queueName, options);
    }
}