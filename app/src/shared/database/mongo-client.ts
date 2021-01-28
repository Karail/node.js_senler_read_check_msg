import mongodb from 'mongodb';
// Services
import { Logger } from '../services';

export class MongoClient extends mongodb.MongoClient {

    static async createConnection() {
        try {
            const client = await MongoClient.connect(String(process.env.MONGO_URL), {
                useUnifiedTopology: true,
            });
            Logger.info('Create mongo connection');
            return client.db(String(process.env.MONGO_DB));
        } catch (e) {
            Logger.error(e);
            throw e;
        }
    }

};
