/**
 * Класс для обработки сообщений из очередей ботов
 */
class WebHookQueueNewConsumer {

    constructor() {

        /**
         * Ссылка на инстанс Rabbit.js
         */
        this.rabbitProvider = null;
    }

    setRabbitProvider(rabbitProvider) {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Инициализирующий метод модуля
     * @returns {Promise<any>}
     */
    async start() {
        let res = await this.rabbitProvider.createConsumeChannel({prefetch: 1});
        return res;
    }

    /**
     * Создание нового потребиителя для очереди
     * @param {string} queue_name
     * @param {function} message_callback
     * @param {object} options
     */
    async consume(queue_name, message_callback, options) {
        this.rabbitProvider.consume(queue_name, (message) => {
            message_callback(message);
        }, options);
    }

    async cancelConsuming(consumerTag) {
        this.rabbitProvider.cancelConsuming(consumerTag);
    }

    /**
     * Подтвердить обработку сообщения
     * @param {object} message
     */
    ackMessage(message) {
        this.rabbitProvider.ackMessage(message);
    }

    /**
     * Отклонить обработку сообщения - отправить обратно в очередь
     * @param {object} message
     */
    nackMessage(message) {
        this.rabbitProvider.nackMessage(message);
    }

}

module.exports = WebHookQueueNewConsumer;