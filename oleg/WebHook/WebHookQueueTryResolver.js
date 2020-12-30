const Errors = require('../Errors/Errors');
/**
 * Обертка для работы с RabbitMQ
 */
let Rabbit = require('../Services/Rabbit');

let WebHookQueueTryProducer = require('./WebHookQueueTryProducer');



/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
class WebHookQueueTryResolver {

    constructor() {
        /**
         * Ключь маршрутизации очередей
         */
        this.keyPrefix = 'wh_try';


        /**
         * ID сервера, на котором запущен процесс
         */
        this.server_id = 0;

        /**
         * Ссылка на инстанс WebHooks.js для обработки шага
         */
        this.webHooksWorker = null;

        /**
         * Ссылка на инстанс WebHookTryProducer.js
         */
        this.producer = new WebHookQueueTryProducer();



        /**
         * Ссылка на инстанс WebHookOrderConsumer.js
         */
      //  this.consumer = new WebHookSenderQueueConsumer();

        /**
         * Конфигурация amqplib исходя из окружения
         */
        const rabbitmq_server = 2;

        this.webhook_request_id = 0;

        this.RabbitWorker = new Rabbit({
            host: global.rabbitmq[rabbitmq_server].host,
            user: global.rabbitmq[rabbitmq_server].user,
            password: global.rabbitmq[rabbitmq_server].password,
            port: global.rabbitmq[rabbitmq_server].port,
            vhost: global.rabbitmq[rabbitmq_server].vhost,
            api_port: global.rabbitmq[rabbitmq_server].api_port
        });

        this.producer.setRabbitProvider(this.RabbitWorker);



    }

    start() {
        /**
         * Обработку и добавление очередей начнем только после соединения с базой данных
         * Рекомендуется создавать по 1 каналу для отправки и получения сообщения на один процесс
         * То есть для 1 запущенного bot.js создаем
         * - 1 постоянное соединение
         * - 2 канала в режиме confirm для публикации и потребления сообщений
         */
        return new Promise((resolve,reject)=>{
            try {

                this.RabbitWorker.createConnection(async () => {
                    let queueName = this.getQueueName();

                    await this.producer.start();
                    await this.producer.assertQueue(queueName);

                    //await this.consumer.start();
                    //await this.addConsumer(queueName);
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
        this.producer.setWebhookRequestId(id);
    }


    setWebHooksWorker(worker) {
        this.webHooksWorker = worker;
    }

    /**
     * Добавляет колбек в очередь
     * @param server_id
     * @param params
     * @returns {Promise<*>}
     */
    add(server_id, params,options) {

        let queueName = this.getQueueName(server_id);
        return this.producer.pushMessage(queueName, {type: 'callback', payload: params},options);
    }

    /**
     * Формирует название новой очереди для добавления
     * префикс + id сервера на котором запущен процесс
     * @returns {string}
     */
    getQueueName() {
        return `${this.keyPrefix}_${this.webhook_request_id}`;
    }


    deleteQueue(){
        this.RabbitWorker.deleteQueue(this.getQueueName(), {ifEmpty: true}, () => {
            console.log('deleteQueue TRY');
        });
    }



}

module.exports = new WebHookQueueTryResolver();