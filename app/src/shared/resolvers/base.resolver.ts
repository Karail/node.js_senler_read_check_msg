import amqp from 'amqplib';
// Queues
import { Rabbit, Redis } from '../queues';
// Consumers
import { BaseQueueConsumer } from '../consumers';
// Producers
import { BaseQueueProducer } from '../producers';
// Services
import { QueueService } from '../services/queue.service';
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
     * Инстанс брокера
     */
    protected rabbitProvider!: Rabbit;
    /**
     * Инстанс Redis Pub
     */
    protected redisPubProvider!: Redis;
    /**
     * Инстанс Redis Sub
     */
    protected redisSubProvider!: Redis;
    /**
     * Время через которое удалить очередь при бездействии для consumer
     */
    private expiredLimit = 3600000;
    /**
     * Инстанс Worker
     */
    protected worker!: BaseQueueWorker;
    /**
     * Сервис для работы с очередями
     */
    protected queueService = new QueueService;

    /**
     * 
     * @param {BaseQueueProducer} producer - Инстанс Producer
     * @param {BaseQueueConsumer} consumer - Инстанс Consumer
     * @param {string} queueName - Имя очереди
     */
    constructor(
        public readonly producer: BaseQueueProducer,
        public readonly consumer: BaseQueueConsumer,
        public readonly queueName: string,
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

            this.producer.setQueueName(queueName);
            this.consumer.setQueueName(queueName);

            this.producer.setRabbitProvider(this.rabbitProvider);
            this.consumer.setRabbitProvider(this.rabbitProvider);

            await this.producer.start();
            await this.producer.assertQueue();

            await this.consumer.start();
            await this.addConsumer();
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    /**
     * Добавляет потребителя для сообщений очереди
     */
    protected addConsumer(): void {

    }

    /**
     * Setter rabbitProvider
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     */
    public setRabbitProvider(rabbitProvider: Rabbit): void {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Setter redisPubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisPubProvider(redisProvider: Redis) {
        this.redisPubProvider = redisProvider;
    }
    
    /**
     * Setter redisSubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisSubProvider(redisProvider: Redis) {
        this.redisSubProvider = redisProvider;
    }

    /**
     * Setter server_id
     * @param {number} id - server_id
     */
    public setServerId(id: number): void {
        this.server_id = id;
    }

    /**
     * Setter worker
     * @param {BaseQueueWorker} worker - Инстанс Worker
     */
    public setWorker(worker: BaseQueueWorker): void {
        this.worker = worker;
    }

    /**
     * Формирует название новой очереди для добавления
     */
    public getQueueName(): string {
        return `${this.queueName}`;
    }

    /**
     * Отправка сообщения в очередь
     * @param {any} payload - Cообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди 
     */
    public sendToQueue(payload: any, options?: amqp.Options.Publish): void {
        this.producer.sendToQueue({ payload }, options);
    }

    /**
     * Удаляет очередь
     * @param {amqp.Options.DeleteQueue} Конфигурация удаления очереди, default = { ifEmpty: false }
     */
    public async deleteQueue(options: amqp.Options.DeleteQueue = { ifEmpty: true }): Promise<amqp.Replies.DeleteQueue | undefined> {
        const queueName = this.getQueueName();
        return this.rabbitProvider.deleteQueue(queueName, options);
    }

    /**
     * Проверка очереди на существование
     */
    public async checkQueue(): Promise<amqp.Replies.AssertQueue | undefined> {
        const queueName = this.getQueueName();
        return this.rabbitProvider.checkQueue(queueName);
    }

    /**
     * Возвращает список очередей
     */
    public async getQueuesList() {
        return this.rabbitProvider.getQueuesList();
    }

    /**
     * Подтвердить обработку сообщения
     * @param {amqp.Message} message
     */
    public ackMessage(message: amqp.Message): void {
        this.consumer.ackMessage(message);
    }
}