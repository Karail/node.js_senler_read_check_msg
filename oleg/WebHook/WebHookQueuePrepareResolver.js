const Errors = require('../Errors/Errors');
/**
 * Обертка для работы с RabbitMQ
 */
let Rabbit = require('../Services/Rabbit');
let request = require('request');

let WebHookQueuePrepareProducer = require('./WebHookQueuePrepareProducer');
let WebHookQueuePrepareConsumer = require('./WebHookQueuePrepareConsumer');


/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
class WebHookQueuePrepareResolver {

    constructor() {
        /**
         * Ключь маршрутизации очередей
         */
        this.keyPrefix = 'wh_prepare';

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
        this.producer = new WebHookQueuePrepareProducer();

        /**
         * Ссылка на инстанс WebHookPrepareConsumer.js
         */
        this.consumer = new WebHookQueuePrepareConsumer();

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

        this.sender_queue = null;
        this.try_queue = null;

        this.webhook_request_id = 0;


        this.expired_limit = 3600000; //Время через которое удалить очередь при бездействии для consumer
        this.api_link = 'http://' + this.RabbitWorker.user + ':' + this.RabbitWorker.password + '@' + this.RabbitWorker.host + ':' + this.RabbitWorker.api_port + '/api/';
    }


    /**
     * Обработка ошибок
     */
    error() {
        this.date_error = new Date();
        console.error(this.date_error.toLocaleString() + ' | ', arguments);
    }


    async start(callback=()=>{}) {
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

                    await this.consumer.start();
                    await this.addConsumer(queueName);

                    resolve(true);

                });
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

    setSenderQueue(queue) {
        this.sender_queue = queue;
    }

    setTryQueue(queue){
        this.try_queue = queue;
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

                    //console.log('PREPARE consume MESSAGE', payload);

                    if ((payload.group_id) /*&& (payload.webhook_id)*/ && (payload.vk_user_id) && (payload.template_id)) {

                        //let data = {body:payload.message};
                      //  console.log('PREPARE consume MESSAGE valid');

                        this.webHooksWorker.prepare_body(payload.template_id, parseInt(payload.group_id), parseInt(payload.vk_user_id),
                            (resp) => {
                               console.log('PREPARE BUBBLE ', resp);

                                if (resp && resp.status === 'ok') {
                                    payload.body = resp.body;
                                    payload.status = 'pending';

                                    //todo to prepare_body
                                    this.webHooksWorker.webhook_request_set(payload.webhook_request_id, {status: 'pending',body:resp.body});
                                    console.log('PREPARE sender_queue  ADD', resp);
                                    
                                    this.sender_queue.add(this.server_id, payload);

                                }

                            });

                    } else {
                        Errors.error(Errors.types.common, {
                            error_code: 8002,
                            text: `.addConsumer >run_button | Неверные параметры`
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
     * Формирует название новой очереди для добавления
     * префикс + id сервера на котором запущен процесс
     * @returns {string}
     */
    getQueueName() {
        return `${this.keyPrefix}_${this.webhook_request_id}`;
    }

    add(params) {
        let queueName = this.getQueueName();
        return this.producer.pushMessage(queueName, {type: 'webhook_prepare', payload: params});
    }

    deleteQueue(){
        this.RabbitWorker.deleteQueue(this.getQueueName(), {ifEmpty: true}, () => {
            console.log('deleteQueue PREPARE');
        });
    }

    checkExpired(){

        let queue = this.getQueueName();

        let res = this.getQueueMsgHasCount(queue).then((has_msg)=>{

            console.log('checkExpired',has_msg);
            if (has_msg === false){
                console.log('checkExpired',has_msg);
                this.RabbitWorker.deleteQueue(queue,{ifUnused: false, ifEmpty: true});
            }

        });


    }

    getQueueMsgHasCount(routingKey) {
        return new Promise((resolve, reject) => {
            try {
                request.get(
                    {
                        url: this.api_link + 'queues/' + encodeURIComponent(this.RabbitWorker.vhost) + '/' + routingKey,
                        timeout: 5000,
                      //  agent: this.agent_http
                    },
                    (err, response, body) => {
                        try {
                            if (err) {
                                reject(err.message);
                                this.error('getQueue request err', routingKey, err);
                            } else {
                                if ((response) && ((response.statusCode === 200) || (response.statusCode === 404))) { //Если не существует то статус 404
                                    try {
                                        let a = JSON.parse(body);

                                        if (a.error) { //Не существует
                                            resolve(false);
                                        }

                                        if (a.hasOwnProperty("messages_ready")) {
                                            // this DOES NOT COUNT UnAck msgs
                                            let msg_ready = JSON.stringify(a.messages_ready);
                                            console.log("message.messages_ready=" + msg_ready);
                                            if (msg_ready > 0 ) {
                                                resolve(true);
                                            }
                                        }

                                        console.log("END");
                                        resolve(false);
                                    } catch (err) {
                                        reject(err.message);
                                        this.error('getQueue request body', routingKey, err);
                                    }
                                } else {
                                    reject('getQueue request status = ' + (response ? response.statusCode : 'response undefined'));
                                    this.error('getQueue request code', routingKey, (response ? response.statusCode : 'response undefined'));
                                }
                            }
                        } catch (err) {
                            reject(err.message);
                            this.error('getQueue request after', routingKey, err);
                        }
                    }
                );
            } catch (err) {
                reject(err.message);
                this.error('getQueue', routingKey, err);
            }
        });
    }


}

module.exports = new WebHookQueuePrepareResolver();