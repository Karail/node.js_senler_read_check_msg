
import { Rabbit } from "src/shared/rabbit";
import { MessageFilterQueueConsumer } from "../consumers/message-filter.consumer";
import { MessageFilterQueueProducer } from "../porducers/message-filter.producer";


/**
 * Класс, который инкапсулирует в себе логику работы с очередями для формирования запроса для вебхука
 * - Разрешение логики добавления запроса для вебхука в очередь
 * - Разрешение логики обработки запроса для вебхука из очереди
 */
export class MessageFilterQueueResolver {
      /**
     * Ссылка на инстанс WebHooks.js для обработки шага
     */
    private messageCheckWorker!: any;
    /**
     * Префикс для именования очередей
     */
    private keyPrefix = 'message-filter';
    /**
     * ID сервера, на котором запущен процесс
     */
    private server_id = 0;
    /**
     * Ссылка на инстанс WebHookPrepareProducer.js
     */
    private producer = new MessageFilterQueueProducer();
    /**
     * Ссылка на инстанс WebHookPrepareConsumer.js
     */
    private consumer = new MessageFilterQueueConsumer();
    /**
     * экземпляр брокера
     */
    private rabbitWorker = new Rabbit();
    /**
     * Время через которое удалить очередь при бездействии для consumer
     */
    private expiredLimit = 3600000;

    constructor() {
        this.producer.setRabbitProvider(this.rabbitWorker);
        this.consumer.setRabbitProvider(this.rabbitWorker);
    }


    /**
     * Обработка ошибок
     */
    error(e: Error) {
        const data = new Date();
        console.error(data.toLocaleString() + ' | ', e.message);
    }


    async start() {
        /**
         * Обработку и добавление очередей начнем только после соединения с базой данных
         * Рекомендуется создавать по 1 каналу для отправки и получения сообщения на один процесс
         * То есть для 1 запущенного bot.js создаем
         * - 1 постоянное соединение
         * - 2 канала в режиме confirm для публикации и потребления сообщений
         */
        try {
            await this.rabbitWorker.createConnection();

            let queueName = this.getQueueName();
    
            await this.producer.start();
            await this.producer.assertQueue(queueName);
    
            await this.consumer.start();
            await this.addConsumer(queueName);
        } catch (e) {
            this.error(e);
        }
    }



    /**
     * @param id
     */
    setServerId(id) {
        this.server_id = id;
    }
  

    setMessageWorker(worker) {
        this.messageWorker = worker;
    }

    setSenderQueue(queue) {
        this.sender_queue = queue;
    }

    setTryQueue(queue){
        this.try_queue = queue;
    }


    /**
     * Добавляет потребителя для сообщений очереди routing_key
     * @param {string} routingKey
     * @returns {Promise<void>}
     */
    async addConsumer(routingKey: string) {

        // const consumerTag = `bot_${this.server_id}`;

        let options = {
            noAck: false,
            // consumerTag: consumerTag
        };


        this.consumer.consume(routingKey, (message) => {
            if (message) {

               //логика фильтрования какая то
               
            }

        }, options);
    }

    /**
     * Формирует название новой очереди для добавления
     * префикс + id сервера на котором запущен процесс
     * @returns {string}
     */
    getQueueName() {
        return `${this.keyPrefix}`;
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

    

}

export default new MessageFilterQueueResolver();