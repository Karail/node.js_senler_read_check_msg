class  WebHookTryExchange {

    constructor() {
        /**
         * Ссылка на инстанс Rabbit.js
         */
        this.rabbitProvider = null;
        this.keyPrefix = 'wh_try_exchange';
        this.exchange_type = 'x-delayed-message';

        this.webhook_request_id = 0;

    }

    getExchangeName() {
        return `${this.keyPrefix}_${this.webhook_request_id}`;
    }



    /**
     * @param id
     */
    setWebhookRequestId(id) {
        this.webhook_request_id = id;
    }


    /**
     * x
     * @param rabbitInstance
     */
    setRabbitProvider(rabbitInstance) {
        this.rabbitProvider = rabbitInstance;
    }

    async assertExchange(options={autoDelete: true, durable: true, passive: true, arguments: {'x-delayed-type': "direct"}}) {

        const res = await  this.rabbitProvider.assertExchange(this.getExchangeName(), this.exchange_type, options);
        return res;

    }


    async add(queue, params,options) { //this.try_queue.server_id, this.getQueueName(), payload,resp.options

        const res = await this.rabbitProvider.publishMessageExchange(this.getExchangeName(),queue,
            JSON.stringify( {type: 'webhook_error', payload: params}),
            options);
        return res;

    }

    async pushExchangeMessage(routing_key, message, options) {

        let res = await this.rabbitProvider.publishMessageExchange(this.getExchangeName(),routing_key, JSON.stringify(message),
            options);
        return res;
    }


    addExchange(server_id, params,options) {
        let queueName = this.getQueueName(server_id);
        return this.producer.pushExchangeMessage(queueName, {type: 'webhook_error', payload: params},options);
    }


}


module.exports = new WebHookTryExchange();