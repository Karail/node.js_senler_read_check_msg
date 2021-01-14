import * as amqp from 'amqplib';
import * as request from 'request-promise';
// Services
import { Logger } from '../services';

export class Rabbit {

    /**
     * Хранит соединение с RabbitMQ
     */
    public amqpConnection!: amqp.Connection;

    /**
     * Хранит писок каналов
     */
    public channels: Map<string, amqp.Channel> = new Map();

    /**
     * 
     * @param {any} connectionLinkOptions - настройки подключения
     */
    constructor(
        private readonly connectionLinkOptions?: any
    ) { }

    /**
     * Создание ссылки подключения к брокеру
     */
    public getConnectionLink(): string {
        return process.env.AMQP_URL || '';
    }

    /**
     * Создание ссылки api для get очередей
     */
    public getQueuesApiUrl(): string {
        return process.env.RABBITMQ_URL || '';
    }

    /**
     * Проверка очереди на сузествование
     * @param {string} queueName - Название очереди
     * @param {amqp.Options.AssertQueue} options - Конфигурация создания очереди
     */
    public async checkQueue(queueName = ''): Promise<amqp.Replies.AssertQueue | undefined> {
        try {
            const channel = this.channels.get(queueName);
            const ok = await channel?.checkQueue(queueName);
            return ok;
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    /**
     * Возвращает список очередей
     */
    public async getQueuesList(): Promise<any[]> {
        try {
            const url = `${this.getQueuesApiUrl()}/api/queues/`;

            let response = await request.get({ url });

            response = JSON.parse(response);

            return response;

        } catch (e) {
            Logger.error('[AMQP] getQueuesList error', e.message);
            throw e;
        }
    }

    /**
     * Создадим соединение с брокером - связь между клиентом и брокером,
     * которая выполняет основные сетевые задачи, в том числе - сетевое взаимодействие
     */
    public async createConnection(): Promise<void> {
        try {
            const connectionLink = this.getConnectionLink();

            const connection = await amqp.connect(connectionLink);

            connection?.on('error', (err) => {
                if (err.message !== 'Connection closing') {
                    Logger.error('[AMQP] conn error', err.message);
                }
            });

            connection?.on('close', () => {
                Logger.error('[AMQP] reconnecting');
                setTimeout(() => {
                    this.createConnection();
                }, 1000);
                return;
            });

            Logger.info('[AMQP] connected');

            this.amqpConnection = connection;

            Logger.info('Create rabbit connection');

        } catch (e) {
            Logger.error('[AMQP] createConnection error', e.message);
            setTimeout(() => {
                this.createConnection();
            }, 1000);
            return;
        }
    }

    /**
     * Подтверждение ответа
     * @param {string} queueName - Название очереди
     * @param {amqp.Message} message - сообщение
     */
    public ackMessage(queueName = '', message: amqp.Message): void {
        const channel = this.channels.get(queueName);
        channel?.ack(message);
    }

    /**
     * Создание канала
     * @param {string} queueName - Название очереди
     */
    public async createChannel(queueName = ''): Promise<boolean> {
        try {
            const channel = await this.amqpConnection?.createChannel();

            channel?.on('error', (err) => {
                Logger.error('[AMQP] channel error', err.message);
            });

            channel?.on('close', () => {
                Logger.info('[AMQP] channel closed');
            });

            this.channels.set(queueName, channel);

            return true;
        } catch (e) {
            Logger.error('[AMQP] createChannel error', e.message);
            throw e;
        }
    }

    /**
     * Открывает канал в режиме подтверждения
     * @param {string} queueName - Название очереди
     * @param {any} config 
     */
    public async createConfirmChannel(queueName = '', config: any = {}): Promise<boolean> {
        try {
            const defaultConfig = {
                prefetch: 1000
            };

            const prefetch = config.prefetch || defaultConfig.prefetch;

            const channel = await this.amqpConnection.createConfirmChannel();

            channel.prefetch(prefetch)

            channel?.on('error', (err) => {
                Logger.error('[AMQP] channel error', err.message);
            });

            channel?.on('close', () => {
                Logger.info('[AMQP] channel closed');
            });

            this.channels.set(queueName, channel);

            return true;
        } catch (e) {
            Logger.error('[AMQP] createConsumeChannel error', e.message);
            throw e;
        }
    }

    /**
     * Создание очереди
     * @param {string} queueName  - Название очереди
     * @param {amqp.Options.AssertQueue} options - Конфигурация создания очереди
     */
    public async assertQueue(queueName = '', options?: amqp.Options.AssertQueue): Promise<amqp.Replies.AssertQueue | undefined> {
        try {
            const channel = this.channels.get(queueName);

            const ok = await channel?.assertQueue(queueName, options);
            return ok;
        } catch (e) {
            Logger.error(`AMQP - assertQueue error - ${queueName}`, e.message);
            throw e;
        }
    }

    /**
     * Удаление очереди
     * @param {string} queueName  - Название очереди
     * @param {amqp.Options.DeleteQueue} options  - Конфигурация удаления очереди, default = { ifUnused: false, ifEmpty: false }
     */
    public async deleteQueue(queueName = '', options: amqp.Options.DeleteQueue = { ifUnused: false, ifEmpty: false }): Promise<amqp.Replies.DeleteQueue | undefined> {
        try {
            const channel = this.channels.get(queueName);

            this.channels.delete(queueName);

            const ok = channel?.deleteQueue(queueName, options);
            return ok;
        } catch (e) {
            Logger.error(`AMQP - deleteQueue error - ${queueName}`, e.message);
            throw e;
        }
    }

    /**
     * Отправка сообщения в очередь
     * @param {string} queueName - Название очереди
     * @param {string} message - сообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди, default = { persistent: true }
     */
    public sendToQueue(queueName = '', message: string, options: amqp.Options.Publish = { persistent: true }): void {
        const channel = this.channels.get(queueName);
        channel?.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), options);
    }

    /**
     * Создание потребяителя для очереди
     * @param {string} queueName - Название очереди
     * @param {Function} callback - Коллбэк для обработки нового сообщения
     * @param {amqp.Options.Consume} options - Конфигурация консьюмера
     */
    public consume(queueName = '', callback: (message: amqp.ConsumeMessage | null) => void, options: amqp.Options.Consume = { noAck: false }): void {
        const channel = this.channels.get(queueName);
        channel?.consume(queueName, callback, options)
    }

    /**
     * Получение очередного сообщения из очереди
     * @param {string} queueName - Название очереди
     * @param {amqp.Options.Get} options - Конфигурация get очереди, default = { noAck: false }
     */
    public async getNextMessage(queueName = '', options: amqp.Options.Get = { noAck: false }): Promise<false | amqp.GetMessage | undefined> {
        try {
            const channel = this.channels.get(queueName);
            const message = await channel?.get(queueName, options);
            return message;
        } catch (e) {
            Logger.error(`AMQP - getNextMessage error - ${queueName}`, e.message);
            throw e;
        }
    }

    /**
     * отменяет прослушивание по тэгу
     * @param {string} queueName - Название очереди
     * @param {string} consumerTag - тэг прослушивателя
     */
    public async cancelConsuming(queueName = '', consumerTag: string): Promise<amqp.Replies.Empty | undefined> {
        try {
            const channel = this.channels.get(queueName);
            const ok = await channel?.cancel(consumerTag);
            return ok;
        } catch (e) {
            Logger.error(`AMQP - cancelConsuming error - ${consumerTag}`, e.message);
            throw e;
        }
    }

    /**
     * Создать обменник
     * @param {string} exchangeName - Имя обменник
     * @param {string} type - Тип обменника
     * @param {amqp.Options.AssertExchange} options - Конфигурация обменника
     */
    public async assertExchange(exchangeName: string, type = '', options?: amqp.Options.AssertExchange): Promise<amqp.Replies.AssertExchange | undefined> {
        try {
            const channel = this.channels.get(exchangeName);
            const exchange = await channel?.assertExchange(exchangeName, type, options);
            return exchange;
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    /**
     * Привязать очередь к обменнеку
     * @param {string} exchangeName - Имя обменник
     * @param {string} keyPrefix - Ключь роутинга очереди
     * @param {string} pattern - pattern
     * @param {any[]} args - Аргументы
     */
    public async bindQueue(exchangeName: string, keyPrefix: string, pattern: string, args = []): Promise<amqp.Replies.Empty | undefined> {
        try {
            const channel = this.channels.get(exchangeName);
            const empty = await channel?.bindQueue(keyPrefix, exchangeName, pattern, args);
            return empty;
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

    /**
     * Опубликовать сообщение в обменник
     * @param {string} exchangeName - Имя обменник
     * @param {any} message - Сообщение
     * @param {string} keyPrefix - Ключь роутинга очереди
     * @param {amqp.Options.Publish} options - Конфигурация сообщения
     */
    public publish(exchangeName: string, message: any, keyPrefix = '', options: amqp.Options.Publish = { persistent: false }): boolean | undefined {
        const channel = this.channels.get(exchangeName);
        return channel?.publish(exchangeName, keyPrefix, Buffer.from(JSON.stringify(message)), options);
    }
}