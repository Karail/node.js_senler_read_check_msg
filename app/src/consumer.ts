import amqp from 'amqplib';

export async function InitQueue() {
    const connection = await amqp.connect('amqp://rabbitmq')

    const channel = await connection.createChannel();
  
    const queue = 'vk-queue-1';
  
    channel.assertQueue(queue, {
      durable: false
    });
   
    console.log('Waiting tasks...');
  
    channel.consume(queue, async (message) => {
        if (message) {
            const content = message.content.toString();
     
            console.log(JSON.parse(content),' received!');

            channel.ack(message);
        }
    });
}