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
            if (message.attempt < Number(process.env.TRY_COUNT)) {
                messageIds.push(message.id);
                attemptIds[message.id] = message.attempt+1;
            }
        });

        console.log('messages',messages,attemptIds);


        if (messageIds.length > 0) {
            let chanks = [];
            let chunk = 100;
            for (let i = 0; i < messageIds.length; i += chunk) {
                chanks.push(messageIds.slice(i, i + chunk));
            }
            let code = `var r = [], i = 0, t = {}, r=[], m=[];`;
            for (let chank of chanks){
                code += `m.push({message_ids:[${chank}]});`;
            }
            code += `while (i < m.length) {
                    t =  API.messages.getById(m[i]);
                    r.push(t);
                    i = i + 1;
                }
                return r;`;


            const r1 = {
                vk_group_id: messages[0].vk_group_id,
                request: {
                    params: {
                        code: code,
                        v: 5.80,
                        lang: 'ru'
                    },
                    url: 'https://api.vk.com/method/execute',
                    priority: 4
                },

                callback: {
                    url:'bot_msg_check',
                    params: {
                        group_id:messages[0].group_id,
                        ids_attempt: attemptIds
                    }
                }
            };

            this.vkQueueResolver.sendToQueue(r1);

         }
    }
}
