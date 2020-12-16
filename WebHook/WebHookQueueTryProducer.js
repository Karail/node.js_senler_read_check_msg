/**
 * Обработка обработка действий с ботами
 * Класс для создания новых очередей и для добавления новых сообщений в очередь
 */
class WebHookQueueTryProducer {

    constructor() {
        /**
         * Ссылка на инстанс Rabbit.js
         */
        this.rabbitProvider = null;

        this.webhook_request_id = 0;
    
        this.keyPrefixDeadLetterRoutingKey = 'wh_sender';
    }

    /**
     * x
     * @param rabbitInstance
     */
    setRabbitProvider(rabbitInstance) {
        this.rabbitProvider = rabbitInstance;
    }

    setWebhookRequestId(id){
        this.webhook_request_id = id;
    }

    getDeadLetterRoutingKey(){
        return `${this.keyPrefixDeadLetterRoutingKey}_${this.webhook_request_id}`;
    }

    /**
     *
     * @param successCallback
     * @returns {Promise<*>}
     */
    async start(successCallback = () => {
    }) {
        const res = await this.rabbitProvider.createChannel();
        return res;
    }

    /**
     * Создание очереди, если ее не существует и получение дополнительных параметров по очереди
     * - Количество сообщений
     * - Количество получателей (consumer)
     * @param routing_key
     * @returns {Promise<*>}
     */
    async assertQueue(routing_key) {

        if (this.rabbitProvider.publishChannel) {
            console.log('Consume already exist try');
        }


        const res = await this.rabbitProvider.assertQueue(routing_key, {

            // durable: false
            durable: true,
            passive: true,
            autoDelete: false,
               //  , deadLetterRoutingKey: this.getDeadLetterRoutingKey()
          //  , deadLetterExchange: ""

              deadLetterExchange: "wh_sender_exchange_0"
              ,  arguments: {'x-delayed-type':  "direct"}
        });

        return res;
    }





    /**
     * Проверка - существует ли очередь, принадлежащая данному инстансу по server_id
     * @param routing_key
     * @return {object}
     * {
     *      queue: string - название очереди
     *      consumerCount: number - количество потребителей
     *      messagesCount: number - количество сообщенийв очереди
     * }
     */
    async checkQueue(routing_key) {
        const res = await this.rabbitProvider.checkQueue(routing_key);
        return res;
    }

    /**
     * Публикация сообщения
     * @param routing_key
     * @param message
     * @param options
     * @returns {Promise<*>}
     */
    async pushMessage(routing_key, message, options) {
        let res = await this.rabbitProvider.publishMessage(routing_key, JSON.stringify(message),
            options);
        return res;
    }


    /**
     * Получение активных очередей для запушенного инстанса bot.js
     * routing_key_prefix формируется из префикса bot и id сервера, на котором запущен процесс
     * @param routing_key_prefix
     * @returns {Promise<*>}
     */
    async getActiveQueues(routing_key_prefix) {
        const queues = await this.rabbitProvider.getQueuesList(routing_key_prefix);
        return queues;
    }
}


module.exports = WebHookQueueTryProducer;