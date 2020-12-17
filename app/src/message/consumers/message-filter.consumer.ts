import * as amqp from 'amqplib';
// Rabbit
import { Rabbit } from "../../shared/rabbit";

export class MessageFilterQueueConsumer {

    /**
     * Ссылка на инстанс Rabbit.js
     */
    private rabbitProvider!: Rabbit

    setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Инициализирующий метод модуля
     */
    async start(): Promise<void> {
        await this.rabbitProvider.createConsumeChannel();
        console.log('MESSAGE-FILTER: 2.Create rabbit consume channel');
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
     * @param {string} consumerTag тэг прослушивателя
     */
    cancelConsuming(consumerTag: string): void {
        this.rabbitProvider.cancelConsuming(consumerTag);
    }

    /**
     * Подтвердить обработку сообщения
     * @param {amqp.Message} message
     */
    ackMessage(message: amqp.Message): void {
        this.rabbitProvider.ackMessage(message);
    }
}