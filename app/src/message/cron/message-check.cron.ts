// Cron
import { BaseCron } from "../../shared/cron";

export class MessageCheckCron extends BaseCron {

    constructor(protected readonly delay: number) {
        super();
    }

    protected async job() {
        console.log('timer init');
        
        const messages = await this.redisPubProvider.smembers('message_set');

        if (messages.length < 1000 && messages.length > 0) {
            const messages = await this.redisPubProvider.spop('message_set');
            console.log(messages);
        }
    }
}