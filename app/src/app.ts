import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
// Services
import { AppService } from './app.service';
import { Logger } from './shared/services';

const app = express();

const port = process.env.APP_PORT;






app.listen(port, async () => {
    const appService = new AppService();
    Logger.info(`microservice started ${port}`);
    appService.init();


});
