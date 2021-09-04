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
     * Подготавливает и публикует сообщения в vk-queue
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

        if (messageIds.length > 0) {

            const Message = this.mongoProvider.collection("messages");

            const result = {
                message_ids: messageIds,
                ids_attempt: attemptIds,
                preview_length: 0,
                extended: 1,
                fields: null,
                group_id: messages[0].group_id,
            }
    
            this.vkQueueResolver.sendToQueue(result);
        }
    }
}