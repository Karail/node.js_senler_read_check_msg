let mongodb = require('mongodb');

/**
 * @var global object
 */

class QueryWebHook {

    /**
     * Обработка ошибок
     */
    error() {
        this.date_error = new Date();
        console.error(this.date_error.toLocaleString() + ' | QueryBot | ', arguments);
    }

    /**
     * Warning
     */
    /*warning(text) {
        this.date_warning = new Date();
        console.log(this.date_warning.toLocaleString() + ' | Warning | QueryBot | ' + text);
    }*/

    /**
     * Информация
     */
    info(text) {
        this.date_info = new Date();
        console.log(this.date_info.toLocaleString() + ' | Info | QueryBot | ' + text);
    }

    /**
     * @typedef Step
     * @property {Object} connect
     */
 
    getWebhookRequest(webhook_request_id) {
        return new Promise((resolve) => {

            if ((this.webhook_request[webhook_request_id])) {
                resolve(this.webhook_request[webhook_request_id]);
            } else {
                
                if (global.mongo) {

                    global.mongo.collection('webhook_requests').findOne({
                        _id: new mongodb.ObjectID(webhook_request_id)
                    },
                    /*    {
                        projection: {
                            _id: 1,
                            body: 1,
                            group_id: 1
                        }
                    },*/
                        (err, webhook_request) => {
                        if (err) {
                            this.error('geWebhookRequest', err);
                        } else {
                            if ((webhook_request) && (webhook_request.length)) {
                                this.webhook_request[webhook_request_id] = webhook_request;
                            }
                            resolve(webhook_request);


                        }
                    })
                }
            }
            
        }).catch((err)=>{
            console.log('getWebhookRequest',err);
        });
    }

    getWebhookTemplate(template_id) {
        return new Promise((resolve) => {
            
            if ((this.template[template_id])) {
                resolve(this.template[template_id]);
            } else {

                if (global.mongo) {

                    global.mongo.collection('webhook_templates').findOne({
                        _id: new mongodb.ObjectID(template_id)
                    },{

                    } , (err, template) => {

                        if (err) {
                        } else {

                            if ((template) && (template.length)) {
                                this.template[template_id] = template;
                            }
                            resolve(template);
                        }
                    });


                }
            }
            
        }).catch((err)=>{
            console.log('getWebhookTemplate',err);
        });
    }

    getStatusWebHook(status) {//getStatusWebhookRequest
        return new Promise((resolve) => {

            if (global.mongo) {
                global.mongo.collection('webhook_requests').find({
                    status: status
                }).toArray((err, webhook_requests) => {

                    if (err) {
                        this.error('getStatusWebHook query', err);
                    } else {
                        resolve(webhook_requests);
                    }
                });
            }

        });
    }

    getWebhook(webhook_id) {
        return new Promise((resolve) => {

            if ((this.webhooks[webhook_id])) {
                resolve(this.webhooks[webhook_id]);
            } else {

                if (global.mongo) {

                    global.mongo.collection('web_hooks').findOne({
                            _id: new mongodb.ObjectID(webhook_id)
                        },
                        /*    {
                            projection: {
                                _id: 1,
                                body: 1,
                                group_id: 1
                            }
                        },*/
                        (err, webhook) => {
                            if (err) {
                                this.error('getWebhook', err);
                            } else {
                                if ((webhook) && (webhook.length)) {
                                    this.webhooks[webhook_id] = webhook;
                                }
                                resolve(webhook);


                            }
                        })
                }
            }

        }).catch((err)=>{
            console.log('getWebhook',err);
        });
    }
 

    constructor(WebHook) {
        this.date_error = null;
        this.date_info = null;

        this.WebHook = WebHook;

        this.template = {};
        this.webhook_request = {};
        this.webhooks = {};

       

    }
}

module.exports = QueryWebHook;