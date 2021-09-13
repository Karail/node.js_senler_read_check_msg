// Workers
import { BaseQueueWorker } from '../../../shared/workers/base.worker';
// Dto
import { MessageDto } from '../../../message/dto';
// Resolvers
import { BaseQueueResolver } from '../../../shared/resolvers';

export class MessageCheckWorker extends BaseQueueWorker {

    /**
     * Очередь vk-queue для потправки
     */
    private vkQueueResolver!: BaseQueueResolver;

    /**
     * Setter vkQueueResolver
     * @param {BaseQueueResolver} vkQueueResolver - Очередь vk-queue для потправки
     */
    public setVkQueueResolver(vkQueueResolver: BaseQueueResolver) {
        this.vkQueueResolver = vkQueueResolver;
    }

    /**
     * Подготавливает и публикует сообщения в vk-request
     * @param messages - Список сообщений
     */
    public async pushToVkQueue(messages: MessageDto[]): Promise<void> {

        const messageIds: number[] = [];

        const attemptIds: any = {};

        messages.forEach((message) => {
            if (message.attempt < 5) {
                messageIds.push(message.id);
                attemptIds[message.id] = message.attempt+1;
            }
        });


        console.log('pushToVkQueue - messages ',messages);

        if (messageIds.length > 0) {

           // const Message = this.mongoProvider.collection("messages");

            const result = {
                message_ids: messageIds,
                ids_attempt: attemptIds,
                preview_length: 0,
                extended: 1,
                fields: null,
                group_id: messages[0].vk_group_id,
            }

            const r = {
                vk_group_id: messages[0].vk_group_id,
                request: {
                    params: {
                        message_ids: messageIds,//100
                        preview_length: 224111,
                        v: 5.78,
                        lang: 'ru'
                    },
                    url: 'https://api.vk.com/method/messages.getById',
                    priority: 10
                },

                callback: {
                    url:'bot_msg_check',
                    params: {
                        group_id:messages[0].group_id,
                        ids_attempt: attemptIds
                    }
                }
            };

            // const code = `var i=0, h, result=[], users=" . json_encode($vk_ids) . ";
            //         while (i < users.length) {
            //             h = API.messages.getById({count: 1, offset: 0, extended: 1, start_message_id: -1, user_id: users[i]});
            //             if (h.conversations[0].last_message_id <= h.conversations[0].out_read) {
            //                 result.push(users[i]);
            //             }
            //             i = i + 1;
            //         } return [result, h];`;
            // const r = {
            //     vk_group_id: messages[0].vk_group_id,
            //     request: {
            //         params: {
            //             message_ids: messageIds,
            //             preview_length: 224111,
            //             v: 5.78,
            //             lang: 'ru'
            //         },
            //         url: 'https://api.vk.com/method/execute',
            //         priority: 10
            //     },
            //
            //     callback: {
            //         url:'bot_msg_check',
            //         params: {
            //             group_id:messages[0].group_id,
            //             ids_attempt: attemptIds
            //         }
            //     }
            // };


            console.log('SEND MSGAG TO VK',r);
            this.vkQueueResolver.sendToQueue(r);
        }
    }
}
