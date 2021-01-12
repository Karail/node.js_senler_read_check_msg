// Workers
import { BaseQueueWorker } from '../../../shared/workers/base.worker';
// Dto
import { MessageDto } from 'src/message/dto';

export class MessageCheckWorker extends BaseQueueWorker {
    public pushToVkQueue(messages: MessageDto[]) {
        console.log(messages);

        const result = {
            message_ids: messages.map((item) => item.id),
            preview_length: 0,
            extended: 1,
            fields: null,
            group_id: messages[0].group_id,
        }

        console.log(result);
    }
}