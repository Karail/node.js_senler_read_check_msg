import * as amqp from 'amqplib';
// Rabbit
import { Rabbit } from "../../shared/rabbit";
import { BaseQueueConsumer } from '../consumers';
import { BaseQueueProducer } from '../producers/base.producer';
// Logger
import { Logger } from '../services';
// Workers
import { BaseQueueWorker } from '../workers/base.worker';

/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class BaseQueueResolver {

    /**
     * ID сервера, на котором запущен процесс
     */
    private server_id = 0;
    /**
     * экземпляр брокера
     */
    private rabbitWorker!: Rabbit;
    /**
     * Время через которое удалить очередь при бездействии для consumer
     */
    private expiredLimit = 3600000;
    /**
     * Ссылка на инстанс Worker
     */
    public messageWorker?: BaseQueueWorker;

    /**
     * 
     * @param producer - Ссылка на инстанс Producer
     * @param consumer - Ссылка на инстанс Consumer
     * @param keyPrefix - Префикс для именования очередей
     */
    constructor(
        public readonly producer: BaseQueueProducer,
        public readonly consumer: BaseQueueConsumer,
        public readonly keyPrefix: string,
    ) { }

    /**
     * Обработку и добавление очередей начнем только после соединения с базой данных
     * Рекомендуется создавать по 1 каналу для отправки и получения сообщения на один процесс
     * То есть для 1 запущенного процесса создаем
     * - 1 постоянное соединение
     * - 2 канала в режиме confirm для публикации и потребления сообщений
     */
    public async start(): Promise<void> {
        try {

            const queueName = this.getQueueName();

            this.producer.setKeyPrefix(queueName);
            this.consumer.setKeyPrefix(queueName);

            this.producer.setRabbitProvider(this.rabbitWorker);
            this.consumer.setRabbitProvider(this.rabbitWorker);

            await this.producer.start();
            await this.producer.assertQueue(queueName);

            await this.consumer.start();
            await this.addConsumer(queueName);
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    public setRabbitProvider(rabbitWorker: Rabbit) {
        this.rabbitWorker = rabbitWorker;
    }
    /**
     * setter id сервера
     * @param id - id сервера
     */
    public setServerId(id: number): void {
        this.server_id = id;
    }

    /**
     * setter воркера
     * @param worker - воркер
     */
    public setMessageWorker(worker: any): void {
        this.messageWorker = worker;
    }

    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} queueName - название очереди
     */
    public addConsumer(queueName = ''): void {

    }

    /**
     * Создание очереди
     * @param {string} queueName - название очереди
     * @param {amqp.Options.AssertQueue} options - Конфигурация создания очереди
     */
    public async checkQueue(queueName = ''): Promise<amqp .Replies.AssertQueue | undefined> {
        return this.rabbitWorker.checkQueue(queueName);
    }

    /**
     * Формирует название новой очереди для добавления
     */
    public getQueueName(): string {
        return `${this.keyPrefix}`;
    }

    public getRabbitProvider(): Rabbit {
        return this.rabbitWorker;
    }

    /**
     * Отправка сообщения в очередь
     * @param {any} payload сообщение
     */
    public publishMessage(payload: any, options?: amqp.Options.Publish): void {
        const queueName = this.getQueueName();
        this.producer.publishMessage(queueName, { payload }, options);
    }

    /**
     * даляет очередь
     */
    public async deleteQueue(): Promise<void> {
        try {
            await this.rabbitWorker.deleteQueue(this.getQueueName(), { ifEmpty: true });
            console.log('deleteQueue PREPARE');
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    public async getQueuesList() {
        return this.rabbitWorker.getQueuesList(this.keyPrefix);
    }
} 