import amqp from 'amqplib';
// Queues
import { Rabbit, Redis } from '../queues';
// Resolvers
import { BaseQueueResolver } from '../resolvers';
// Workers
import { BaseQueueWorker } from '../workers/base.worker';
// Exchangers
import { BaseExchange } from '../exchangers/base.exchange';
// Services
import { Logger } from './log.service';

export class QueueService {

    /**
     * Создание очереди
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     * @param {BaseQueueWorker} worker - Инстанс Worker
     * @param {BaseQueueResolver} resolver - Инстанс Resolver
     * @param {number} serverId - id сервера
     * @param {Redis} redisPubProvider - Инстанс Redis Pub
     * @param {Redis} redisSubProvider  - Инстанс Redis Sub
     */
    public async createQueue(
        rabbitProvider: Rabbit,
        worker: BaseQueueWorker,
        resolver: BaseQueueResolver,
        serverId: number,
        redisPubProvider: Redis,
        redisSubProvider: Redis,

    ): Promise<BaseQueueResolver> {
        try {
            worker.setRabbitProvider(rabbitProvider);
            resolver.setRabbitProvider(rabbitProvider);
            resolver.setServerId(serverId);
            resolver.setWorker(worker);
            resolver.setRedisPubProvider(redisPubProvider);
            resolver.setRedisSubProvider(redisSubProvider);
    
            await resolver.start();
    
            return resolver;
        } catch (e) {
            Logger.error(e);
            throw e; 
        }
    }

    /**
     * Создание обменника
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     * @param {BaseExchange} exchange - Инстанс обменника
     */
    public async createExchange(
        rabbitProvider: Rabbit,
        exchange: BaseExchange,
        assertOptions?: amqp.Options.AssertExchange
    ): Promise<BaseExchange> {
        try {
            exchange.setRabbitProvider(rabbitProvider);
            await exchange.start();
            await exchange.assertExchange(assertOptions);
    
            return exchange;
        } catch (e) {
           Logger.error(e);
           throw e; 
        }
    }
}