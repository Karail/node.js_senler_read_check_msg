// Reslovers
import { MessageExchange } from './message/exchangers/message.exchanger';
import { MessageExchangerQueueResolver } from './message/resolvers';
// Workers
import { MessageExchangerWorker } from './message/workers';
// Rabbitmq
import { Rabbit } from './shared/rabbit';
// Logger
import { Logger } from './shared/services';
import { QueueService } from './shared/services/queue.service';

export class AppService {
    /**
     * On Module Init
     */
    public async init() {

        const rabbitProvider = new Rabbit();

        await rabbitProvider.createConnection();

        Logger.info('Create rabbit connection');

        const queueService = new QueueService();


        const resolver = await queueService.createQueue(
            rabbitProvider,
            new MessageExchangerWorker(),
            new MessageExchangerQueueResolver(),
            0
        );

        const exchange =  new MessageExchange('message-exchange');

        exchange.setRabbitProvider(rabbitProvider);
        await exchange.start();
        await exchange.assertExchange();

    }
}