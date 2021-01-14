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
// Storage
import { LocalStorage } from '../../local-storage';
// Cron
import { BaseCron } from '../cron';

export class QueueService {

    /**
     * Создание очереди
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     * @param {BaseQueueWorker} worker - Инстанс Worker
     * @param {BaseQueueResolver} resolver - Инстанс Resolver
     * @param {number} serverId - id сервера
     * @param {Redis} redisProvider - Инстанс Redis
     * @param {LocalStorage} localStorage - Инстанс хранилища
     */
    public async createQueue(
        rabbitProvider: Rabbit,
        worker: BaseQueueWorker,
        resolver: BaseQueueResolver,
        serverId: number,
        redisProvider: Redis,
        localStorage: LocalStorage

    ): Promise<BaseQueueResolver> {
        try {
            worker.setRabbitProvider(rabbitProvider);
            resolver.setRabbitProvider(rabbitProvider);
            resolver.setServerId(serverId);
            resolver.setWorker(worker);
            resolver.setRedisProvider(redisProvider);
            resolver.setLocalStorage(localStorage);

            await resolver.start();
    
            return resolver;
        } catch (e) {
            Logger.error(e);
            throw e; 
        }
    }

    /**
     * Создать Cron
     * @param {BaseCron} cron - Инстанс Cron
     * @param {BaseQueueWorker} worker - Инстанс Worker
     * @param {Redis} redisProvider - Инстанс Redis
     * @param {LocalStorage} localStorage - Инстанс хранилища
     */
    public createCron(
        cron: BaseCron,
        worker: BaseQueueWorker,
        redisProvider: Redis,
        localStorage: LocalStorage
    ): BaseCron {
        cron.setRedisProvider(redisProvider);
        cron.setWorker(worker);
        cron.setLocalStorage(localStorage);
        cron.start();
        return cron;
    } 

    /**
     * Создание обменника
     * @param {Rabbit} rabbitProvider - Инстанс брокера
     * @param {BaseExchange} exchange - Инстанс обменника
     * @param {amqp.Options.AssertExchange} assertOptions - Конфигурация обменника
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