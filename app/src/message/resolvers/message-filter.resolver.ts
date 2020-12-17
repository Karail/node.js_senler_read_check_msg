// Rabbit
import { Rabbit } from "../../shared/rabbit";
// Consumers
import { MessageFilterQueueConsumer } from "../consumers";
// Producers
import { MessageFilterQueueProducer } from "../porducers";
// Workers
import { MessageWorker } from "../workers/message.worker";

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageFilterQueueResolver {
    /**
     * Ссылка на инстанс Worker
     */
    private messageWorker!: MessageWorker;
    /**
     * Префикс для именования очередей
     */
    private keyPrefix = 'message-filter';
    /**
     * ID сервера, на котором запущен процесс
     */
    private server_id = 0;
    /**
     * Ссылка на инстанс WebHookPrepareProducer.js
     */
    private producer = new MessageFilterQueueProducer();
    /**
     * Ссылка на инстанс WebHookPrepareConsumer.js
     */
    private consumer = new MessageFilterQueueConsumer();
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
     * То есть для 1 запущенного bot.js создаем
     * - 1 постоянное соединение
     * - 2 канала в режиме confirm для публикации и потребления сообщений
     */
    public async start() {
        try {
            await this.rabbitWorker.createConnection();

            console.log('MESSAGE-FILTER: 1.Create rabbit connection');

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

    public setServerId(id: number) {
        this.server_id = id;
    }

    public setMessageWorker(worker: any) {
        this.messageWorker = worker;
    }

    /**
     * Добавляет потребителя для сообщений очереди queueName
     * @param {string} queueName - название очереди
     */
    public async addConsumer(queueName: string) {
        this.consumer.consume(queueName, (message) => {
            if (message) {
                console.log('2-', message);
                //логика фильтрования какая то

            }

        }, { noAck: false, consumerTag: `consumer-group-${1}` });
    }

    /**
     * Формирует название новой очереди для добавления
     */
    public getQueueName() {
        return `${this.keyPrefix}`;
    }

    public publishMessage(payload: any) {
        const queueName = this.getQueueName();
        return this.producer.publishMessage(queueName, { type: 'webhook_prepare', payload });
    }

    public async deleteQueue() {
        try {
            await this.rabbitWorker.deleteQueue(this.getQueueName(), { ifEmpty: true });
            console.log('deleteQueue PREPARE');
        } catch (e) {
            console.log(e);
            throw e;
        }
    }
}