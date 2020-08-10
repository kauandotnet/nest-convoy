import {
  CommandHandler,
  EventBus,
  ICommandHandler,
  CommandMessage,
} from '@nest-convoy/core';

import { DoSomethingCommand } from './do-something.command';
import { AccountDebited } from '../events/account-debited';
import { uniqueId } from './tokens';

@CommandHandler(DoSomethingCommand)
export class DoSomethingCommandHandler
  implements ICommandHandler<DoSomethingCommand> {
  constructor(private readonly eventBus: EventBus) {}

  async execute({
    command,
  }: CommandMessage<DoSomethingCommand>): Promise<void> {
    const event = new AccountDebited(uniqueId);
    await this.eventBus.publish(event);
  }
}