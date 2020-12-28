import amqp from 'amqplib';
// Rabbitmq
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
    public setRabbitProvider(rabbitProvider: Rabbit) {
        this.rabbitProvider = rabbitProvider;
    }

    async start() {
        await this.rabbitProvider.createChannel(this.exchangeName);
    }

    getExchangeName() {
        return `${this.exchangeName}`;
    }

    async assertExchange(options: amqp.Options.AssertExchange & { passive: boolean } = {
        autoDelete: false,
        durable: false,
        passive: true,
        arguments: {'x-delayed-type': "direct"}
    }) {

        return this.rabbitProvider.assertExchange(this.exchangeName,this.exchangeType, options);
    }


    publish(queueName = '', message: any, options: amqp.Options.Publish): boolean | undefined {
        return this.rabbitProvider.publish(this.exchangeName, message, queueName, options);
    }
}