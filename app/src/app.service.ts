// Reslovers
import { MessageNewQueueResolver } from './message/queues/resolvers/message-new.resolver';
// Workers
import { MessageNewWorker } from './message/queues/workers';
// Brokers
import { Rabbit } from './shared/rabbit';
// Services
import { Logger } from './shared/services';
import { QueueService } from './shared/services/queue.service';
// Exchangers
import { MessageExchange } from './message/exchangers/message.exchanger';

export class AppService {
    /**
     * On Module Init
     */
    public async init() {

        const rabbitProvider = new Rabbit();

        await rabbitProvider.createConnection();

        Logger.info('Create rabbit connection');

        const queueService = new QueueService();

        const exchange = new MessageExchange('message-exchange', 'direct');

        exchange.setRabbitProvider(rabbitProvider);
        await exchange.start();
        await exchange.assertExchange({
            durable: false
        });

        await queueService.createQueue(
            rabbitProvider,
            new MessageNewWorker(),
            new MessageNewQueueResolver('message-exchange'),
            0
        );

        exchange.publish('message-new', {
            group_id: 1
        });
    }
}