// Reslovers
import { MessageQueueResolver } from './message/resolvers/message.resolver';
// Workers
import { MessageWorker } from './message/workers/message.worker';

export class AppService {
    /**
     * On Module Init
     */
    public async init() {

        const worker = new MessageWorker();
        const resolver = new MessageQueueResolver();

        resolver.setServerId(0);
        resolver.setMessageWorker(worker);
        await resolver.start();
        resolver.publishMessage('asdad');
    }
}