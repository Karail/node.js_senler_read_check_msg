// подключение express
let express = require("express");
let bodyParser = require("body-parser");


//Должен быть последним
let ConfigInit = require('./includes/ConfigInit');
ConfigInit.start(null , 'webhook','main',true);
ConfigInit.mysql_connect({connectionLimit: 5});



let WebHookQueueNewResolver = require('./includes/WebHook/WebHookQueueNewResolver');
let WebHook = require('./includes/WebHookNew');

let WebHookQueueTryResolver = require('./includes/WebHook/WebHookQueueTryResolver');
let WebHookTryExchange = require('./includes/WebHook/WebHookTryExchange');

let WebHookSenderExchange = require('./includes/WebHook/WebHookSenderExchange');

let Rabbit = require('./includes/Services/Rabbit');


let server;
global.server_id = parseInt(global.program.server_id);


if (global.servers.webhook_producer[global.server_id]) {
    server = global.servers.webhook_producer[global.server_id];
} else {
    console.error('Server dont exist');
    process.exit(-1);
}



ConfigInit.mongodb_connect(() => {


    setTimeout(async () => {

        WebHookQueueNewResolver.setServerId(global.program.server_id)
        WebHookQueueNewResolver.setWebHooksWorker(WebHook);
        await WebHookQueueNewResolver.start();


        // общая очередь try
        WebHookQueueTryResolver.setServerId(global.program.server_id);
        WebHookQueueTryResolver.setWebHooksWorker(WebHook);

        await WebHookQueueTryResolver.start();


        let rabbit = WebHookQueueTryResolver.RabbitWorker;
        const rabbitmq_server = 2;


        //общий обменник
        WebHookTryExchange.setRabbitProvider(rabbit);
        WebHookSenderExchange.setRabbitProvider(rabbit);

        WebHook.senderExchange = WebHookSenderExchange;
        WebHook.tryExchange = WebHookTryExchange;
        WebHook.try_queue = WebHookQueueTryResolver;


        //связали очередь try c обменникм try

        await WebHookTryExchange.assertExchange();
        await WebHookSenderExchange.assertExchange();

        await rabbit.bindQueue(WebHookQueueTryResolver.getQueueName(), WebHookTryExchange.getExchangeName(), WebHookQueueTryResolver.getQueueName());


    }, 1000);


});

let app = express();

let appServer = app.listen(server.port);
appServer.setTimeout(60000);