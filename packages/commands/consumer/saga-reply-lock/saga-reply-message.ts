import { Message, MessageHeaders } from '@nest-convoy/messaging/common';

import { LockTarget } from './lock-target';

export class SagaReplyMessage extends Message {
  constructor(
    payload: string,
    headers: MessageHeaders,
    readonly lockTarget?: LockTarget,
  ) {
    super(payload, headers);
  }
}
