import * as dotenv from 'dotenv';

dotenv.config();

import * as http from 'http';

import messageResolver from './message/resolvers/message.resolver';
import { MessageWorker } from './message/workers/message.worker';
// Queues
import { Rabbit } from './shared/rabbit';

http.createServer(async (req, res) => {

    const RabbitWorker = new Rabbit();

    await RabbitWorker.createConnection();

    console.log('MESSAGE: 1.Create rabbit connection');

    const worker = new MessageWorker();

    messageResolver.setServerId(0);
    messageResolver.setMessageWorker(worker);
    messageResolver.start();

    /**
     * Сконфигурируем потребителя
     */
    // messageConsumer.setRabbitProvider(RabbitWorker);
    // messageConsumer.init();

    console.log('app start');
}).listen(3000);