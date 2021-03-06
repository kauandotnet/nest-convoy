import { Injectable } from '@nestjs/common';

import { DispatcherFactory } from '@nest-convoy/common';
import { CommandHandlers } from '@nest-convoy/commands/consumer';
import { ConvoyMessageConsumer } from '@nest-convoy/messaging/consumer';
import { ConvoyMessageProducer } from '@nest-convoy/messaging/producer';
import { SagaLockManager } from '@nest-convoy/sagas/common';

import { SagaCommandDispatcher } from './saga-command-dispatcher';

@Injectable()
export class SagaCommandDispatcherFactory
  implements DispatcherFactory<SagaCommandDispatcher, CommandHandlers> {
  constructor(
    private readonly messageConsumer: ConvoyMessageConsumer,
    private readonly messageProducer: ConvoyMessageProducer,
    private readonly sagaLockManager: SagaLockManager,
  ) {}

  create(
    commandDispatcherId: string,
    commandHandlers: CommandHandlers,
  ): SagaCommandDispatcher {
    return new SagaCommandDispatcher(
      commandDispatcherId,
      commandHandlers,
      this.messageConsumer,
      this.messageProducer,
      this.sagaLockManager,
    );
  }
}
