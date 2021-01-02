import IORedis from 'ioredis';

export class Redis extends IORedis {

    constructor(options?: IORedis.RedisOptions) {
        super(options);
    }
}