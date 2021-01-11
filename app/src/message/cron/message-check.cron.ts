// Cron
import { BaseCron } from "../../shared/cron";

export class MessageCheckCron extends BaseCron {

    constructor(
        protected readonly delay: number,
        protected readonly keyPrefix: number
    ) {
        super();
    }

    protected async job() {
        console.log('timer init');

        const setName = `message_set-${this.keyPrefix}`;
        
        const messages = await this.redisPubProvider.smembers(setName);

        if (messages.length < 100 && messages.length > 0) {
            const messages = await this.redisPubProvider.spop(setName);
            console.log(messages);
        }
    }
}