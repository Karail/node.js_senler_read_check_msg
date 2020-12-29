// Brokers
import { Rabbit } from '../rabbit';
// Resolvers
import { BaseQueueResolver } from '../resolvers';
// Workers
import { BaseQueueWorker } from '../workers/base.worker';

export class QueueService {

    /**
     * Создание очереди
     * @param rabbitProvider - Инстанс брокера
     * @param worker - Инстанс Worker
     * @param resolver - Инстанс Resolver
     * @param serverId - id сервера
     */
    public async createQueue(
        rabbitProvider: Rabbit,
        worker: BaseQueueWorker,
        resolver: BaseQueueResolver,
        serverId: number
    ): Promise<BaseQueueResolver> {
        worker.setRabbitProvider(rabbitProvider);
        resolver.setRabbitProvider(rabbitProvider);
        resolver.setServerId(serverId);
        resolver.setMessageWorker(worker);

        await resolver.start();

        return resolver;
    }
}