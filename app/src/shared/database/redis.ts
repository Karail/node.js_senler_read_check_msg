import IORedis from 'ioredis';
// Services
import { Logger } from '../services';

export class Redis extends IORedis {

    constructor(options?: IORedis.RedisOptions) {
        super(options);
        Logger.info('Create redis connection');
    }
}