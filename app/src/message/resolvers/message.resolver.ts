import * as amqp from 'amqplib';
// Rabbit
import { Rabbit } from "../../shared/rabbit";
// Consumers
import { MessageQueueConsumer } from "../consumers";
// Producers
import { MessageQueueProducer } from "../porducers";
// Workers
import { MessageWorker } from "../workers";
// Resolvers
import { MessageFilterQueueResolver } from "./message-filter.resolver";

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageQueueResolver {
    /**
     * Ссылка на инстанс Worker
     */
    private messageWorker!: MessageWorker;
    /**
     * Префикс для именования очередей
     */
    private keyPrefix = 'message-check';
    /**
     * ID сервера, на котором запущен процесс
     */
    private server_id = 0;
    /**
     * Ссылка на инстанс Producer
     */
    private producer = new MessageQueueProducer();
    /**
     * Ссылка на инстанс Consumer
     */
    private consumer = new MessageQueueConsumer();
    /**
     * экземпляр брокера
     */
    private rabbitWorker = new Rabbit();
    /**
     * Время через которое удалить очередь при бездействии для consumer
     */
    private expiredLimit = 3600000;

    constructor() {
        this.producer.setRabbitProvider(this.rabbitWorker);
        this.consumer.setRabbitProvider(this.rabbitWorker);
    }

    /**
     * Обработку и добавление очередей начнем только после соединения с базой данных
     * Рекомендуется создавать по 1 каналу для отправки и получения сообщения на один процесс
     * То есть для 1 запущенного процесса создаем
     * - 1 постоянное соединение
     * - 2 канала в режиме confirm для публикации и потребления сообщений
     */
    public async start(): Promise<void> {
        try {
            await this.rabbitWorker.createConnection();

            console.log('MESSAGE: 1.Create rabbit connection');

            const queueName = this.getQueueName();

            await this.producer.start();
            await this.producer.assertQueue(queueName);

            await this.consumer.start();
            await this.addConsumer(queueName);
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    public setServerId(id: number): void {
        this.server_id = id;
    }

    public setMessageWorker(worker: any): void {
        this.messageWorker = worker;
    }

    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} queueName - название очереди
     */
    public addConsumer(queueName: string): void {

        this.consumer.consume(queueName, async (message) => {
            if (message) {

                console.log(await this.checkQueue(this.getQueueName()));

                const content = JSON.parse(message.content.toString());

                const resolver = new MessageFilterQueueResolver();
                resolver.setServerId(0);
                resolver.setMessageWorker(this.messageWorker);
                await resolver.start();
                // let item = {};

                // if (this.messageWorker.goups[message.group_id] === false) {
                //     // создаём очередь my_qeueu_ + group_id



                //     this.messageWorker.goups[message.group_id] = item;

                // } else {
                //     item = this.messageWorker.goups[message.group_id];
                // }
                // //пушим в нее mwssage

                // item.filter.add(message);
            }

        }, { noAck: false });
    }

    /**
     * Создание очереди
     * @param {string} queueName  - название очереди
     * @param {amqp.Options.AssertQueue} options - Конфигурация создания очереди
     */
    public async checkQueue(queueName: string): Promise<amqp .Replies.AssertQueue> {
        try {
            const ok = await this.rabbitWorker.checkQueue(queueName);
            return ok;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    /**
     * Формирует название новой очереди для добавления
     */
    public getQueueName(): string {
        return `${this.keyPrefix}`;
    }

    public publishMessage(payload: any): void {
        const queueName = this.getQueueName();
        this.producer.publishMessage(queueName, { type: 'webhook_prepare', payload });
    }

    public async deleteQueue(): Promise<void> {
        try {
            await this.rabbitWorker.deleteQueue(this.getQueueName(), { ifEmpty: true });
            console.log('deleteQueue PREPARE');
        } catch (e) {
            console.log(e);
            throw e;
        }
    }
}