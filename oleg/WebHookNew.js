let amqp = require('amqplib/callback_api');
let request = require('request');
let uuid = require('node-uuid');
let http = require('http');
let mongodb = require('mongodb');
let _QueryWebHook = require('./WebHook/QueryWebHook');
const {Worker} = require('worker_threads');

/**
 * @var global object
 */

class WebHookNew {

    /**
     * @var {String} this.groups.tokens.vk_token
     */

    /**
     * Обработка ошибок
     */
    error() {
        this.date_error = new Date();
        console.error(this.date_error.toLocaleString() + ' | ', arguments);
    }

    /**
     * Вывод информации
     */
    info() {
        this.date_info = new Date();
        console.log(this.date_info.toLocaleString() + ' | ', arguments);
    }


    /**
     * Проверка на бездействие очередей
     */
    checkExpired() {
        let time = new Date().getTime();
        for (let webhooks_id in this.webhooks) {
            if (this.webhooks.hasOwnProperty(webhooks_id)) {
                let item = this.webhooks[webhooks_id];
                if (time > item.expired) {

                    item['WebHookQueuePrepareResolver'].deleteQueue();
                    item['WebHookQueueSenderResolver'].deleteQueue();
                    item['WebHookQueueTryResolver'].deleteQueue();

                    delete this.webhooks[webhooks_id];

                }
            }
        }
    }

    constructor() {

        this.date_info = null;
        this.date_error = null;


        this.amqpConn = null; //Хранит соединение с RabbitMQ
        this.agent_http = new http.Agent({
            keepAlive: true,
            maxSockets: 1000,
            keepAliveMsecs: 3000
        });


        this.procChannel = null; //Хранеит объект с подключенными каналами для consumer

        this.webhooks = {}; //Данные сообществ для consumer

        this.publisher_groups = {}; //Данные сообществ для publisher

        this.stop_all = false; //Флаг который останавливает все запросы (для перезаупска) для consumer

        this.wh_expired = 15000; //Время через которое удалить очередь при бездействии для consumer

        this.prefetch = 1;



        this.QueryWebHook = new _QueryWebHook(this);


        this.try_delay = [60*5,60*20,3600,3600,3600,3600,3600,3600,3600,3600,3600,3600*3,3600*3,3600*3,3600*3,3600*3,3600*3,3600*3,3600*3,3600*3];

        if (true){
            this.try_delay = [1000,2000,3000,4000,5000,6000,1000,1000,1000,1000,1000,1000,1000,1000];
        }

        this.max_responce_try = 5;

        this.tryExchange = null;
        this.senderExchange = null;

        this.try_queue = null;



        /*
        setInterval(() => {
            this.checkExpired();
        }, 10000);
*/

    }


    /**
     * Перезагрузка неиспользуемых связей у пользователей связей у шага или получение количества
     * @param {int} webhook_id
     * @param {int} template_id
     * @param {int} vk_user_id
     * @param {int} group_id
     * @param {function} callback
     */
    prepare_body(template_id, group_id, vk_user_id, callback = () => {
    }) {

        // this.info(`.prepare_body  template_id=${template_id}, group_id=${group_id}, vk_user_id=${vk_user_id}`);

        console.log('SENDER prepare_body Worker');

        let w = new Worker(__dirname + '/WebHook/PrepareBody.js', {
            workerData: {
                program: {
                    server_id: global.program.server_id,
                    env: global.program.env
                },

                // webhook_id: webhook_id,
                template_id: template_id,
                group_id: group_id,
                vk_user_id: vk_user_id
            }
        });

        w.on('message', (msg) => {
            console.log('SENDER prepare_body Worker callback');
            callback(msg.arr);
            w.terminate();
        });
    }


    send_request(type_request, webhook_request_id, url, body, vk_user_id, group_id, callback = () => {
    }) {

        //this.info(`.send_request  group_id=${group_id}, webhook_request_id=${webhook_request_id}, body=${body}`);
        this.QueryWebHook.getWebhookRequest(webhook_request_id).then((webhook_request) => {

            if (webhook_request) {
                console.log('SENDER send_request begin');
                request.post(
                    {
                        url: url,
                        json: body,
                        timeout:2000
                    },
                    (err, response) => {

                        let status = null;
                        let current_try = {};


                        if (err) {
                            console.log('SENDER send_request responce err', err.code);

                            status = 'warning';

                            current_try = {
                                'code': err.code,
                                'text': err.message,
                                'date_execute': new Date()
                            };
                        } else {

                            if ((response) && (response.statusCode === 200)) {
                                status = 'success';
                            } else {

                                if (webhook_request.try.length < this.max_responce_try) {
                                    status = 'warning';
                                } else {
                                    status = 'error';
                                }
                            }
                            current_try = {
                                'code': response.statusCode,
                                'text': response.statusMessage,
                                'date_execute': new Date()
                            };

                        }


                        this.webhook_request_try(status, webhook_request_id, current_try);
                        this.preseach_active_flag(status, webhook_request);

                        let delay = 1000;

                        if(typeof this.try_delay[webhook_request.try.length] !== 'undefined') {//todo check ! 999
                            delay = this.try_delay[webhook_request.try.length];
                        }

                        callback({
                            status: status,

                            options: {
                                expiration: 1000 * webhook_request.try.length,
                                persistent: true,
                                headers: {"x-delay": delay}
                                // headers: { /*"x-delay": 7000 */ webhook_request.try.length}
                            }

                        });

                    }
                );
            }


        }).catch((err) => {
            console.log('SENDER send_request getWebhookRequest error', err);
        })


    }


    get_lead(group_id, vk_user_id) {
        return new Promise((resolve) => {
            if (global.mongo) {

                global.mongo.collection('leads').findOne({
                    group_id: group_id,
                    vk_user_id: vk_user_id,
                }, (err, lead) => {
                    if (err) {
                        this.error('query_lead lead', err);
                    } else {
                        resolve(lead);
                    }
                })
            }
        });
    }


    /**
     * Прибавление статистики участников всего шага
     * @param {string} webhook_request_id
     * @param {string} status
     *
     */
    webhook_request_set(webhook_request_id, set) {
        global.mongo.collection('webhook_requests').updateOne(
            {
                _id: new mongodb.ObjectId(webhook_request_id),
            },
            {
                $set: set
            },
            (err) => {
                if (err) {
                    this.error('webhook_request_set', webhook_request_id);
                }
            }
        );
    }

    webhook_request_try(status, webhook_request_id, current_try) {


        global.mongo.collection('webhook_requests').updateOne(
            {
                _id: new mongodb.ObjectId(webhook_request_id),
            },
            {
                $push: {try: current_try},
                $set: {
                    'status': status
                }
            }, {},
            (err, r) => {
                if (err) {
                    this.error('webhook_request_try_status', webhook_request_id, err);
                }
            }
        );
    }

    load_pending(queue_prepare) {


        return new Promise((resolve, reject) => {

            this.QueryWebHook.getStatusWebHook('pending').then((webhook_requests) => {

                if (webhook_requests && webhook_requests.length) {

                    for (let webhook_request in webhook_requests) {
                        if (webhook_requests.hasOwnProperty(webhook_request)) {

                            let item = webhook_requests[webhook_request];

                            let message = {
                                type: item.type,
                                template_id: item.template_id,
                                group_id: item.group_id,
                                vk_user_id: item.vk_user_id,
                                webhook_request_id: item._id,
                                url: item.url
                            };

                            console.log('QUeue_prepare.add', message);
                            queue_prepare.add(queue_prepare.server_id, message);
                        }
                    }

                }
                resolve();
            });

        });


    }

    load_warning(queue_sender) {


        return new Promise((resolve, reject) => {

            this.QueryWebHook.getStatusWebHook('warning').then((webhook_requests) => {

                if (webhook_requests && webhook_requests.length) {

                    for (let webhook_request in webhook_requests) {
                        if (webhook_requests.hasOwnProperty(webhook_request)) {

                            let item = webhook_requests[webhook_request];

                            let message = {
                                type: item.type,
                                type_request: item.type_request,
                                template_id: item.template_id,
                                group_id: item.group_id,
                                vk_user_id: item.vk_user_id,
                                webhook_request_id: item._id,
                                url: item.url,
                                body: item.body,
                            };

                            console.log('QUeue_queue_sender.add', message);
                            queue_sender.add(queue_sender.server_id, message);
                        }
                    }

                }
                resolve();
            });

        });


    }

    preseach_active_flag(status, webhook_request) {

        this.QueryWebHook.getWebhook(webhook_request.webhook_id).then((webhook) => {

            let active = webhook.active;
            let count_errors = webhook.count_errors;

            if (status === 'warning' || status === 'error') {

                if (webhook_request.count_errors > 500) {
                    active = 0;
                } else {
                    count_errors += 1;
                }


            }
            if (status === 'success') {
                count_errors = 0;
                active = 1;
            }

            //this.webhook_request_set(webhook_request.webhook_id, {count_errors: count_errors,active:active});
            global.mongo.collection('web_hooks').updateOne(
                {
                    _id: new mongodb.ObjectId(webhook_request.webhook_id),
                },
                {
                    $set: {count_errors: count_errors, active: active}
                },
                (err) => {
                    if (err) {
                        this.error('preseach_active_flag', webhook_request);
                    }
                }
            );

        }).catch((err) => {
            console.log('preseach_active_flag error', err);
        });


    }


    async process_new(data) {

        let item = {};

        if (this.webhooks[data.webhook_id]) {

            item =  this.webhooks[data.webhook_id];
            item['expired'] = new Date().getTime() + this.wh_expired;

        } else {

            item['WebHookQueuePrepareResolver'] = require('./WebHook/WebHookQueuePrepareResolver');
            item['WebHookQueueSenderResolver'] = require('./WebHook/WebHookQueueSenderResolver');
            //item['WebHookQueueTryResolver'] = require('./WebHook/WebHookQueueTryResolver');
            //item['WebHookTryExchange'] = require('./WebHook/WebHookTryExchange');

            let rabbit = item['WebHookQueuePrepareResolver'].RabbitWorker;

            item['WebHookQueuePrepareResolver'].setWebhookRequestId(data.webhook_request_id);
            item['WebHookQueueSenderResolver'].setWebhookRequestId(data.webhook_request_id);
            //item['WebHookQueueTryResolver'].setWebhookRequestId(data.webhook_request_id);


            //item['WebHookTryExchange'].setWebhookRequestId(data.webhook_request_id);
            //item['WebHookTryExchange'].setRabbitProvider(rabbit);

            item['WebHookQueuePrepareResolver'].setWebHooksWorker(this);
            item['WebHookQueueSenderResolver'].setWebHooksWorker(this);


            item['WebHookQueuePrepareResolver'].setSenderQueue(item['WebHookQueueSenderResolver']);

            //item['WebHookQueuePrepareResolver'].setTryQueue(item['WebHookQueueTryResolver']);
            item['WebHookQueueSenderResolver'].setTryQueue(this.try_queue);
            //item['WebHookQueueSenderResolver'].setTryExchange(item['WebHookTryExchange']);
            item['WebHookQueueSenderResolver'].tryExchange = this.tryExchange;

            //item['WebHookQueueSenderResolver'].setTryQueue(item['WebHookQueueTryResolver']);


            await item['WebHookQueuePrepareResolver'].start();
            await item['WebHookQueueSenderResolver'].start();
            //await item['WebHookQueueTryResolver'].start();


            //await item['WebHookTryExchange'].assertExchange();
            //let tryQueueName = item['WebHookQueueTryResolver'].getQueueName();
            //let exchangeName = item['WebHookTryExchange'].getExchangeName();


            //await rabbit.bindQueue(tryQueueName, exchangeName, tryQueueName);

            let senderQueueName = item['WebHookQueueSenderResolver'].getQueueName();

            await rabbit.bindQueue(senderQueueName, this.senderExchange.getExchangeName(), senderQueueName);



            item['expired'] = new Date().getTime() + this.wh_expired;

            this.webhooks[data.webhook_id] = item;

        }

        item['WebHookQueuePrepareResolver'].add(data);

    }


    getListQueue(page = 1, callback = () => {
    }) {
        try {
            let rabbit_host = global.rabbitmq[2].host;
            let api_link = 'http://' + global.rabbitmq[2].user + ':' + global.rabbitmq[2].password + '@' + rabbit_host + ':' + global.rabbitmq[2].api_port + '/api/';


            request.get(
                {
                    url: api_link + 'queues/' + encodeURIComponent(global.rabbitmq[2].vhost) + '?page=' + page + '&page_size=100&name=wh_&use_regex=false&pagination=true',
                    timeout: 20000
                    //,agent: this.agent_http
                },
                (err, response, body) => {
                    try {
                        if (err) {
                            this.error('getListQueue request err', err);
                        } else {
                            if (response.statusCode === 200) {
                                try {
                                    let a = JSON.parse(body);
                                    if (a.items) {
                                        this.getListQueue(page + 1, callback);
                                        callback(a.items);
                                    } else {
                                        this.info('getListQueue not found items');
                                    }
                                } catch (err) {
                                    this.error('getListQueue request body', err);
                                }
                            } else if (response.statusCode === 400) {
                                this.info('getListQueue done');
                            } else {
                                this.error('getListQueue request code', response.statusCode);
                            }
                        }
                    } catch (err) {
                        this.error('getListQueue request after', err);
                    }
                }
            );
        } catch (err) {
            this.error('getListQueue', err);
        }
    }

    getListExchanges(page = 1, callback = () => {
    }) {
        try {
            let rabbit_host = global.rabbitmq[2].host;
            let api_link = 'http://' + global.rabbitmq[2].user + ':' + global.rabbitmq[2].password + '@' + rabbit_host + ':' + global.rabbitmq[2].api_port + '/api/';

            request.get(
                {
                    url: api_link + 'exchanges/' + encodeURIComponent(global.rabbitmq[2].vhost) + '?page=' + page + '&page_size=100&name=wh_&use_regex=false&pagination=true',
                    timeout: 20000
                    //,agent: this.agent_http
                },
                (err, response, body) => {
                    try {
                        if (err) {
                            this.error('getListExchanges request err', err);
                        } else {
                            if (response.statusCode === 200) {
                                try {
                                    let a = JSON.parse(body);
                                    if (a.items) {
                                        this.getListQueue(page + 1, callback);
                                        callback(a.items);
                                    } else {
                                        this.info('getListExchanges not found items');
                                    }
                                } catch (err) {
                                    this.error('getListExchanges request body', err);
                                }
                            } else if (response.statusCode === 400) {
                                this.info('getListExchanges done');
                            } else {
                                this.error('getListExchanges request code', response.statusCode);
                            }
                        }
                    } catch (err) {
                        this.error('getListExchanges request after', err);
                    }
                }
            );
        } catch (err) {
            this.error('getListExchanges', err);
        }
    }


    removeExchanges(callback = () => {
    }) {
        this.getListExchanges(1, (items) => {

            for (let item of items) {

                let rabbit_host = global.rabbitmq[2].host;
                let api_link = 'http://' + global.rabbitmq[2].user + ':' + global.rabbitmq[2].password + '@' + rabbit_host + ':' + global.rabbitmq[2].api_port + '/api/';

                let url = api_link + "exchanges/%2F/" + item.name;
                request({
                    url: url,
                    method: "DELETE"
                }, function (errr, ress, body) {

                    console.log(url, body);
                });

            }

        });
    }


    removeQueue(callback = () => {
    }) {
        this.getListQueue(1, (items) => {

            for (let item of items) {
                let rabbit_host = global.rabbitmq[2].host;
                let api_link = 'http://' + global.rabbitmq[2].user + ':' + global.rabbitmq[2].password + '@' + rabbit_host + ':' + global.rabbitmq[2].api_port + '/api/';

                let url = api_link + "queues/%2F/" + item.name;
                request({
                    url: url,
                    method: "DELETE"
                }, function (errr, ress, body) {
                    console.log(url, body);
                });
            }

        });
    }

    /*
    checkExpired
    * */


}

module.exports = new WebHookNew();