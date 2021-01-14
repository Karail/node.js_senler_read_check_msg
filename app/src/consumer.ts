import amqp from 'amqplib';

export async function InitQueue() {
    try {
        const connection = await amqp.connect('amqp://rabbitmq')

    const channel = await connection.createChannel();
  
    const queue = 'vk-queue-1';
  
    channel.assertQueue(queue, {
      durable: false
    });
   
    console.log('Waiting tasks...');
  
    channel.consume(queue, async (message) => {
        if (message) {
            channel.ack(message);

            const content = message.content.toString();
     
            console.log(JSON.parse(content),' received!');

            const channelE = await connection.createChannel();

            const exchange = 'message-exchange';

            channelE.assertExchange(
                exchange, 
                'x-delayed-message', 
                {
                    durable: false,
                    autoDelete: false,
                    arguments: {
                        'x-delayed-type': 'direct'
                    }
                }
            );
            
            channelE.publish(
                exchange, 
                'message-exchange', 
                Buffer.from(JSON.stringify({
                    payload: {
                        id: 3,
                        user_id: 2,
                        group_id: 1,
                        read_state: 1
                    }
                })),
                {
                    persistent: false,
                    headers: {
                        'x-delay': 1000
                    }
                }
            );
        }
    });
    } catch (e) {
       console.log(e);
       throw e; 
    }
}