import * as amqp from 'amqplib';
import * as request from 'request-promise';

export class Rabbit {

    /**
     * Хранит соединение с RabbitMQ
     */
    public amqpConnection!: amqp.Connection;
    /**
     * Хранит один канал для producer
     */
    public publishChannel!: amqp.ConfirmChannel;
    /**
     * Хранит один канал в режиме подтверждения
     */
    public consumeChannel!: amqp.ConfirmChannel;

    constructor(
        private readonly connectionLinkOptions?: any
    ) { }

    /**
     * Создание ссылки подключения к брокеру
     */
    public getConnectionLink(): string {
        return process.env.RABBITMQ_URL || '';
    }

    /**
     * Создание ссылки api для get очередей
     */
    public getQueuesApiUrl(): string {
        return ``;
    }

    /**
     * Создание очереди
     * @param {string} queueName  - название очереди
     * @param {amqp.Options.AssertQueue} options - Конфигурация создания очереди
     */
    public async checkQueue(queueName: string): Promise<amqp.Replies.AssertQueue> {
        try {
            const ok = await this.publishChannel.checkQueue(queueName);
            return ok;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }
    /**
     * Возвращает список очередей по имени
     * @param {string} name 
     */
    public async getQueuesList(name: string): Promise<any[]> {

        try {

            let items: any[] = [];
            let total_items = 0;
            let page = 1;
            let page_count = 1;

            do {

                const request_api_url = `${this.getQueuesApiUrl()}?page=${page}&page_size=100&name=${name}&use_regex=true&pagination=true`;
                let response = await request.get({
                    url: request_api_url
                });

                response = JSON.parse(response);

                if (response?.items) {

                    items = [...items, ...response.items]
                    page_count = response.page_count
                    total_items = response.filtered_count
                    page++

                } else {
                    break;
                }

            } while (items.length !== total_items)

            return items;

        } catch (e) {
            console.error("[AMQP] getQueuesList error", e.message);
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

            connection.on('error', (err) => {
                if (err.message !== 'Connection closing') {
                    console.error('[AMQP] conn error', err.message);
                }
            });

            connection.on('close', () => {
                console.error('[AMQP] reconnecting');
                setTimeout(() => {
                    this.createConnection();
                }, 1000);
                return;
            });

            console.log('[AMQP] connected');

            this.amqpConnection = connection;

        } catch (e) {
            console.error('[AMQP] createConnection error', e.message);
            setTimeout(() => {
                this.createConnection();
            }, 1000);
            return;
        }
    }

    /**
     * Подтверждение ответа
     * @param {amqp.Message} message - сообщение
     */
    public ackMessage(message: amqp.Message): void {
        this.consumeChannel.ack(message);
    }

    /**
     * Создание канала
     */
    public async createChannel(): Promise<boolean> {
        try {
            const channel = await this.amqpConnection?.createConfirmChannel();

            channel.on('error', (err) => {
                console.error('[AMQP] channel error', err.message);
            });

            channel.on('close', () => {
                console.log('[AMQP] channel closed');
            });

            this.publishChannel = channel;

            return true;
        } catch (e) {
            console.error("[AMQP] createChannel error", e.message);
            throw e;
        }
    }

    /**
     * Открывает канал в режиме подтверждения
     * @param {any} config 
     */
    public async createConsumeChannel(config: any = {}): Promise<boolean> {
        try {
            const defaultConfig = {
                prefetch: 1000
            };

            const prefetch = config.prefetch || defaultConfig.prefetch;

            const channel = await this.amqpConnection.createConfirmChannel();

            channel.prefetch(prefetch)

            channel.on("error", (err) => {
                console.error("[AMQP] channel error", err.message);
            });

            channel.on("close", () => {
                console.log("[AMQP] channel closed");
            });

            this.consumeChannel = channel;

            return true;
        } catch (e) {
            console.error("[AMQP] createConsumeChannel error", e.message);
            throw e;
        }
    }

    /**
     * Создание очереди
     * @param {string} queueName  - название очереди
     * @param {amqp.Options.AssertQueue} options - Конфигурация создания очереди
     */
    public async assertQueue(queueName: string, options: amqp.Options.AssertQueue = { durable: true }): Promise<amqp.Replies.AssertQueue> {
        try {
            const ok = await this.publishChannel.assertQueue(queueName, options);
            return ok;
        } catch (e) {
            console.error(`AMQP - assertQueue error - ${queueName}`, e.message);
            throw e;
        }
    }

    /**
     * Удаление очереди
     * @param {string} queueName  - Название очереди
     * @param {amqp.Options.DeleteQueue} options  - Конфигурация удаления очереди, default = { ifUnused: false, ifEmpty: false }
     */
    public async deleteQueue(queueName: string, options: amqp.Options.DeleteQueue = { ifUnused: false, ifEmpty: false }): Promise<amqp.Replies.DeleteQueue> {
        try {
            const ok = await this.publishChannel.deleteQueue(queueName, options);
            return ok;
        } catch (e) {
            console.error(`AMQP - deleteQueue error - ${queueName}`, e.message);
            throw e;
        }
    }

    /**
     * Отправка сообщения в очередь
     * @param {string} queueName - название очереди
     * @param {string} message - сообщение
     * @param {amqp.Options.Publish} options - Конфигурация отправки очереди, default = { persistent: true }
     */
    public publishMessage(queueName: string, message: string, options: amqp.Options.Publish = { persistent: true }): void {
        this.publishChannel.sendToQueue(queueName, Buffer.from(message), options);
    }

    /**
     * Создание потребяителя для очереди
     * @param {string} queueName - Название очереди
     * @param {Function} callback - Коллбэк для обработки нового сообщения
     * @param {amqp.Options.Consume} options - Конфигурация консьюмера
     */
    public consume(queueName: string, callback: (message: amqp.ConsumeMessage | null) => void, options: amqp.Options.Consume = { noAck: false }): void {
        this.consumeChannel.consume(queueName, callback, options)
    }

    /**
     * Получение очередного сообщения из очереди
     * @param {string} queueName  - Название очереди
     * @param {amqp.Options.Get} options - Конфигурация get очереди, default = { noAck: false }
     */
    public async getNextMessage(queueName: string, options: amqp.Options.Get = { noAck: false }): Promise<false | amqp.GetMessage> {
        try {
            const message = await this.consumeChannel.get(queueName, options);
            return message;
        } catch (e) {
            console.error(`AMQP - getNextMessage error - ${queueName}`, e.message);
            throw e;
        }
    }

    /**
     * отменяет прослушивание по тэгу
     * @param {string} consumerTag - тэг прослушивателя
     */
    public async cancelConsuming(consumerTag: string): Promise<amqp.Replies.Empty> {
        try {
            const ok = await this.consumeChannel.cancel(consumerTag);
            return ok;
        } catch (e) {
            console.error(`AMQP - cancelConsuming error - ${consumerTag}`, e.message);
            throw e;
        }
    }

}