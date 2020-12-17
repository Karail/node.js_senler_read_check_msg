import * as dotenv from 'dotenv';
dotenv.config();

import * as express from 'express';
// Services
import { AppService } from './app.service';

const app = express();

const port = process.env.APP_PORT;

app.listen(port, async () => {

    const appService = new AppService();
    
    await appService.init();

    console.log(`microservice started ${port}`);
});