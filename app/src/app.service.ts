// Reslovers
import { MessageNewQueueResolver } from './message/queues/resolvers/message-new.resolver';
import { MessageCheckQueueResolver } from './message/queues/resolvers';
// Workers
import { MessageCheckWorker, MessageNewWorker } from './message/queues/workers';
// Brokers
import { Rabbit } from './shared/rabbit';
// Services
import { Logger } from './shared/services';
import { QueueService } from './shared/services/queue.service';
// Exchangers
import { MessageExchange } from './message/exchangers/message.exchanger';

export class AppService {

    private readonly queueService = new QueueService();

    /**
     * On Module Init
     */
    public async init() {

        const rabbitProvider = new Rabbit();

        await rabbitProvider.createConnection();

        Logger.info('Create rabbit connection');

        const exchangeName = 'message-exchange';

        const exchange = new MessageExchange(exchangeName);

        exchange.setRabbitProvider(rabbitProvider);
        await exchange.start();
        await exchange.assertExchange({
            durable: false,
            autoDelete: false,
            arguments: { 
                'x-delayed-type': 'direct'
            }
        });

        await this.initQueues(rabbitProvider, exchangeName);

        exchange.publish(exchangeName, {
            group_id: 1
        }, {
            persistent: false,
            headers: { 
                'x-delay': 3000
            }
        });
    }
    private async initQueues(rabbitProvider: Rabbit, exchangeName?: string) {

        const queues = await rabbitProvider.getQueuesList();

        const queueNames = queues.map((item) => item.name);

        for (const queueName of queueNames) {

            if (queueName === 'message-new') {
                await this.queueService.createQueue(
                    rabbitProvider,
                    new MessageNewWorker(),
                    new MessageNewQueueResolver('message-new', 'key1', exchangeName),
                    0
                );
            }
            else {
                await this.queueService.createQueue(
                    rabbitProvider,
                    new MessageCheckWorker(),
                    new MessageCheckQueueResolver(queueName, 'key1', exchangeName),
                    0
                );
            }
        }
        if (!queueNames.includes('message-new')) {
            await this.queueService.createQueue(
                rabbitProvider,
                new MessageNewWorker(),
                new MessageNewQueueResolver('message-new', 'key1', exchangeName),
                0
            );
        }
    }
}