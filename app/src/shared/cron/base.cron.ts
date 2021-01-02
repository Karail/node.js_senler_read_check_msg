// Queues
import { Redis } from "../queues";

export class BaseCron {

    protected timeout!: NodeJS.Timeout

    protected readonly delay!: number;

    /**
     * Инстанс redis pub
     */
    protected redisPubProvider!: Redis;
    /**
     * Инстанс redis sub
     */
    protected redisSubProvider!: Redis;

    /**
     * Setter redisPubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisPubProvider(redisProvider: Redis) {
        this.redisPubProvider = redisProvider;
    }
    /**
     * Setter redisSubProvider
     * @param {Redis} redisProvider - Инстанс redis
     */
    public setRedisSubProvider(redisProvider: Redis) {
        this.redisSubProvider = redisProvider;
    }
    
    public start() {
        this.init(this.delay);
    }
    private async init(delay: number) {

        this.timeout = setTimeout(run.bind(this), delay);

        function run(this: any) {
            this.job();
            setTimeout(run.bind(this), delay);
        }
    }
    public remove() {
        clearTimeout(this.timeout);
    }
    protected job() {

    }
}