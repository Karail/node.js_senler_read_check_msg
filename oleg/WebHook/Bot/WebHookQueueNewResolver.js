const Errors = require('../../Errors/Errors');
/**
 * Обертка для работы с RabbitMQ
 */
let Rabbit = require('../../Services/Rabbit');
let request = require('request');

let WebHookQueueNewProducer = require('../WebHookQueueNewProducer');
let WebHookQueueNewConsumer = require('../WebHookQueueNewConsumer');


/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
class WebHookQueueNewResolver {

    constructor() {
        /**
         * Ключь маршрутизации очередей
         */
        this.keyPrefix = 'wh_bot_new';

        /**
         * ID сервера, на котором запущен процесс
         */
        this.server_id = 0;

        /**
         * Ссылка на инстанс WebHooks.js для обработки шага
         */
        this.webHooksWorker = null;

        /**
         * Ссылка на инстанс WebHookPrepareProducer.js
         */
        this.producer = new WebHookQueueNewProducer();

        /**
         * Ссылка на инстанс WebHookPrepareConsumer.js
         */
        this.consumer = new WebHookQueueNewConsumer();

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


    }


    /**
     * Обработка ошибок
     */
    error() {
        this.date_error = new Date();
        console.error(this.date_error.toLocaleString() + ' | ', arguments);
    }


    start() {
        /**
         * Обработку и добавление очередей начнем только после соединения с базой данных
         * Рекомендуется создавать по 1 каналу для отправки и получения сообщения на один процесс
         * То есть для 1 запущенного bot.js создаем
         * - 1 постоянное соединение
         * - 2 канала в режиме confirm для публикации и потребления сообщений
         */
        this.RabbitWorker.createConnection(async () => {

            let queueName = this.getQueueName();

            await this.producer.start();
            await this.producer.assertQueue(queueName);

            await this.consumer.start();
            await this.addConsumer(queueName);


        });


    }


    /**
     * @param id
     */
    setServerId(id) {
        this.server_id = id;
    }

    setWebHooksWorker(worker) {
        this.webHooksWorker = worker;
    }


    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {object} routing_key
     * @returns {Promise<void>}
     */
    async addConsumer(routing_key) {

        console.log(routing_key);

        // const consumerTag = `bot_${this.server_id}`;

        let options = {
            noAck: false,
            // consumerTag: consumerTag
        };


        this.consumer.consume(routing_key, (message) => {
            if (message) {
                console.log('NEW consume MESSAGE');
                try {

                    const content = JSON.parse(message.content.toString());
                    const {type, payload} = content;

                    this.webHooksWorker.process_new(payload);

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
                    console.log('NEW consume ERROR', e);

                }
            }

        }, options);
    }

    /**
     * Формирует название новой очереди для добавления
     * префикс + id сервера на котором запущен процесс
     * @returns {string}
     */
    getQueueName() {
        return `${this.keyPrefix}_${this.server_id}`;
    }

    // add(server_id, params) {
    //     let queueName = this.getQueueName(server_id);
    //     return this.producer.pushMessage(queueName, {type: 'webhook', payload: params});
    // }


}

module.exports = new WebHookQueueNewResolver();