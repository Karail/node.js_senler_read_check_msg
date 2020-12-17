/**
 * Обработка обработка действий с ботами
 * Класс для создания новых очередей и для добавления новых сообщений в очередь
 */
class WebHookQueueNewProducer {

    constructor() {
        /**
         * Ссылка на инстанс Rabbit.js
         */
        this.rabbitProvider = null;
    }

    /**
     * x
     * @param rabbitInstance
     */
    setRabbitProvider(rabbitInstance) {
        this.rabbitProvider = rabbitInstance;
    }

    /**
     *
     * @param successCallback
     * @returns {Promise<*>}
     */
    async start(successCallback = () => {}) {
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

            //this.info('Consume already exist', vk_group_id);
            console.log('Consume already exist new');
       //     return false;
        }

        const res = await this.rabbitProvider.assertQueue(routing_key, {
            durable: false, maxPriority: 10
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
     * @returns {Promise<*>}
     */
    async pushMessage(routing_key, message) {

        let res = await this.rabbitProvider.publishMessage(routing_key, JSON.stringify(message));
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


module.exports = WebHookQueueNewProducer;