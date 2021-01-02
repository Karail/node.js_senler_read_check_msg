import { Logger } from "../../../shared/services";
import { BaseRedisConsumer } from "../../../shared/consumers";

export class MessageCheckRedisConsumer extends BaseRedisConsumer {
    constructor(key = ['messages-queue']) {
        super(key);
    }

    protected addConsumer() {
        this.consume<any>(async (channel, message) => {
            if (channel == 'messages-queue') {
                const content = JSON.parse(message);

                console.log('redis', content);
    
                const messages = await this.redisPubProvider.smembers('message_set');
    
                if (messages.length > 1000) {
                    const messages = await this.redisPubProvider.spop('message_set');
                    console.log(messages);
                }
            }
        })
    }
}