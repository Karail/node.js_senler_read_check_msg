// Reslovers
import { MessageExchangerQueueResolver } from './message/resolvers';
// Workers
import { MessageExchangerWorker } from './message/workers';
// Rabbitmq
import { Rabbit } from './shared/rabbit';
// Logger
import { Logger } from './shared/services';

export class AppService {
    /**
     * On Module Init
     */
    public async init() {

        const rabbitWorker = new Rabbit();

        await rabbitWorker.createConnection();

        Logger.info('1.Create rabbit connection')

        const worker = new MessageExchangerWorker();

        worker.setRabbitProvider(rabbitWorker);

        const resolver = new MessageExchangerQueueResolver();

        resolver.setRabbitProvider(rabbitWorker);
        resolver.setServerId(0);
        resolver.setMessageWorker(worker);
        await resolver.start();
        resolver.publishMessage({
            group_id: 1
        });
    }
}