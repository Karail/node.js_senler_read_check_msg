const Errors = require('../Errors/Errors');
/**
 * Обертка для работы с RabbitMQ
 */
let Rabbit = require('../Services/Rabbit');

let WebHookQueueSenderProducer = require('./WebHookQueueSenderProducer');
let WebHookQueueSenderConsumer = require('./WebHookQueueSenderConsumer');


/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
class WebHookQueueSenderResolver {

    constructor() {
        /**
         * Ключь маршрутизации очередей
         */
        this.keyPrefix = 'wh_sender';


        /**
         * ID сервера, на котором запущен процесс
         */
        this.server_id = 0;

        /**
         * Ссылка на инстанс WebHooks.js для обработки шага
         */
        this.webHooksWorker = null;

        /**
         * Ссылка на инстанс WebHookOrderProducer.js
         */
        this.producer = new WebHookQueueSenderProducer();

        /**
         * Ссылка на инстанс WebHookOrderConsumer.js
         */
        this.consumer = new WebHookQueueSenderConsumer();

        this.exchange = null;


        this.webhook_request_id = 0;

        /**
         * Конфигурация amqplib исходя из окружения
         */
        const rabbitmq_server = 2;

        this.RabbitWorker = new Rabbit({
            host: global.rabbitmq[rabbitmq_server].host,
            user: global.rabbitmq[rabbitmq_server].user,
            password: global.rabbitmq[rabbitmq_server].password,
            port: global.rabbitmq[rabbitmq_server].port,
            vhost: global.rabbitmq[rabbitmq_server].vhost,
            api_port: global.rabbitmq[rabbitmq_server].api_port
        });

        this.producer.setRabbitProvider(this.RabbitWorker);
        this.consumer.setRabbitProvider(this.RabbitWorker);

        this.tryExchange = null;


    }

    start() {
        /**
         * Обработку и добавление очередей начнем только после соединения с базой данных
         * Рекомендуется создавать по 1 каналу для отправки и получения сообщения на один процесс
         * То есть для 1 запущенного bot.js создаем
         * - 1 постоянное соединение
         * - 2 канала в режиме confirm для публикации и потребления сообщений
         */

        return new Promise((resolve, reject) => {
            try {

                this.RabbitWorker.createConnection(async () => {
                    let queueName = this.getQueueName();

                    await this.producer.start();
                    await this.producer.assertQueue(queueName);

                    await this.consumer.start();

                    await this.addConsumer(queueName);
                    resolve(true);
                })

            } catch (e) {
                reject(e);
            }

        });


    }

    /**
     * @param id
     */
    setServerId(id) {
        this.server_id = id;
    }

    /**
     * @param id
     */
    setWebhookRequestId(id) {
        this.webhook_request_id = id;
    }

    setWebHooksWorker(worker) {
        this.webHooksWorker = worker;
    }

    setTryQueue(queue) {
        this.try_queue = queue;
    }

    setTryExchange(exchange) {
        this.exchange = exchange;
    }

    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {object} routing_key
     * @returns {Promise<void>}
     */
    async addConsumer(routing_key) {

        // const consumerTag = `bot_${this.server_id}`;

        let options = {
            noAck: false,
            // consumerTag: consumerTag
        };

        this.consumer.consume(routing_key, (message) => {
            if (message) {

                try {
                    const content = JSON.parse(message.content.toString());
                    const {type, payload} = content;

                    console.log('SENDER new msg', payload);
                    if ((payload.url) && (payload.vk_user_id) && (payload.group_id) && (payload.webhook_request_id)) {

                        let item = this.webHooksWorker.webhooks[payload.webhook_id];
                        item['expired'] = new Date().getTime() + this.webHooksWorker.wh_expired;


                        console.log('SENDER send_request');
                        this.webHooksWorker.send_request(
                            (payload.type_request),
                            (payload.webhook_request_id),
                            (payload.url),
                            (payload.body),
                            parseInt(payload.vk_user_id),
                            parseInt(payload.group_id),
                            (resp) => {

                                console.log('SENDER BUBBLE send_request', resp);

                                if (resp && resp.status === 'success') {

                                } else if (resp && resp.status === 'warning') { //

                                    // console.log('SENDER TRY_queue SEND');
                                    // this.exchange.add(this.try_queue.server_id, this.try_queue.getQueueName(), payload, resp.options);
                                    console.log('SENDER ExTry Add bad msg');
                                    this.tryExchange.add( this.getQueueName()/*this.try_queue.getQueueName()*/, payload, resp.options);

                                }

                            }
                        );
                    } else {
                        console.log('SENDER BAD msg parmas', payload);
                        Errors.error(Errors.types.common, {
                            error_code: 8002,
                            text: `.addConsumer >send_request | Неверные параметры`
                        })
                    }

                    /**
                     * Подтверждаем сообщение независмо от того, какой будет результат обработки
                     * Так как в случае ошибки сообщение может зависнуть в очереди (бесконечный цикл - получили ошибку ->  передобавили в очередь)
                     * Но факт ошибки залогируем
                     */
                    setTimeout(() => {
                        this.consumer.ackMessage(message);
                    }, 10);

                } catch (e) {
                    Errors.error(Errors.types.common, e);
                }
            }

        }, options);
    }

    /**
     * Добавляет колбек в очередь
     * @param server_id
     * @param params
     * @returns {Promise<*>}
     */
    add(server_id, params) {
        let queueName = this.getQueueName(server_id);
        return this.producer.pushMessage(queueName, {type: 'callback', payload: params});
    }

    /**
     * Формирует название новой очереди для добавления
     * префикс + id сервера на котором запущен процесс
     * @returns {string}
     */
    getQueueName() {
        return `${this.keyPrefix}_${this.webhook_request_id}`;
    }

    deleteQueue() {
        this.RabbitWorker.deleteQueue(this.getQueueName(), {ifEmpty: true}, () => {
            console.log('deleteQueue SENDER');
        });
    }
}

module.exports = new WebHookQueueSenderResolver();