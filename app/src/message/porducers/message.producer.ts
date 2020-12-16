import { Rabbit } from "src/shared/rabbit";

export class MessageQueueProducer {

    private rabbitProvider!: Rabbit;
    private consumer!: any;

    setRabbitProvider(rabbitProvider: Rabbit) {
        this.rabbitProvider = rabbitProvider;
    }

    /**
     * Инициализирующий метод модуля
     */
    async start() {
        await this.rabbitProvider.createChannel();
        console.log('MESSAGE: 3.Create rabbit producer channel');
    }

    /**
     * Создание очереди, если ее не существует и получение дополнительных параметров по очереди
     * - Количество сообщений
     * - Количество получателей (consumer)
     * @param {string} routing_key
     * @returns {Promise<*>}
     */
    async assertQueue(routingKey: string) {
        if (this.rabbitProvider.publishChannel) {
            //this.info('Consume already exist', vk_group_id);
            console.log('Consume already exist prepare');
            //  return false;
        }

        try {
            const ok = await this.rabbitProvider.assertQueue(routingKey, {
                durable: false, maxPriority: 10
            });
            console.log(ok);
        } catch (e) {
            console.log(e);
        }
    }
    
    /**
     * Публикация сообщения
     * @param {string} routing_key
     * @param {any} message
     * @returns {Promise<*>}
     */
    async pushMessage(routingKey: string, message: any) {
        const res = await this.rabbitProvider.publishMessage(routingKey, JSON.stringify(message));
        return res;
    }
}
export default new MessageQueueProducer();