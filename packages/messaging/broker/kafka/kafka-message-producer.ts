import { Injectable } from '@nestjs/common';

import { Message, MessageProducer } from '@nest-convoy/messaging';

import { KafkaProxy } from './kafka-proxy';
import { KafkaMessageBuilder } from './kafka-message-builder';

@Injectable()
export class KafkaMessageProducer extends MessageProducer {
  constructor(
    private readonly kafka: KafkaProxy,
    private readonly message: KafkaMessageBuilder,
  ) {
    super();
  }

  async send(
    destination: string,
    message: Message,
    isEvent: boolean,
  ): Promise<void> {
    await this.kafka.producer.send({
      topic: destination,
      messages: [this.message.to(message)],
    });
  }
}
