import * as amqp from 'amqplib';
// Queue
import { Rabbit } from "../../shared/rabbit";

export class MessageQueueConsumer {

    /**
     * Ссылка на инстанс Rabbit.js
     */
    private rabbitProvider!: Rabbit

    setRabbitProvider(rabbitProvider: Rabbit) {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Инициализирующий метод модуля
     */
    async start() {
        await this.rabbitProvider.createConsumeChannel();
        console.log('MESSAGE: 2.Create rabbit consume channel');
    }

    /**
     * Создание нового потребиителя для очереди
     * @param {string} queueName
     * @param {Function} message_callback
     * @param {amqp.Options.Consume} options
     */
    async consume(queueName: string, callback: (message: amqp.ConsumeMessage | null) => void, options: amqp.Options.Consume) {
        this.rabbitProvider.consume(queueName, (message) => {
            callback(message);
        }, options);
    }

    async cancelConsuming(consumerTag: string) {
        this.rabbitProvider.cancelConsuming(consumerTag);
    }

    /**
     * Подтвердить обработку сообщения
     * @param {amqp.Message} message
     */
    ackMessage(message: amqp.Message) {
        this.rabbitProvider.ackMessage(message);
    }
}
export default new MessageQueueConsumer();