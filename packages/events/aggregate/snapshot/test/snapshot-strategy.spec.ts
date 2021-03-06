import { Type } from '@nestjs/common';

import { OnEvent, OnMessage } from '@nest-convoy/core';

import { NestSnapshotStrategy, SnapshotStrategy } from '../snapshot-strategy';
import { MissingApplyEventMethodStrategy } from '../../missing-apply-event-method-strategy';
import { EventWithMetadata } from '../../interfaces';
import { Aggregates } from '../../aggregates';
import {
  ApplyEvent,
  ProcessCommand,
  CommandProcessingAggregate,
} from '../../command-processing-aggregate';

class AccountSnapshot {
  constructor(readonly balance: number) {}
}

class AccountCommand {}

class AccountCreatedEvent {
  constructor(readonly initialBalance: number) {}
}

class AccountDebitedEvent {
  constructor(readonly amount: number, readonly transactionId: string) {}
}

class CreateAccountCommand {
  constructor(readonly initialBalance: number) {}
}

class DebitAccountCommand extends AccountDebitedEvent {}

export class Account extends CommandProcessingAggregate<
  Account,
  AccountCommand
> {
  id: string | number;
  balance: number;

  @OnEvent(AccountCreatedEvent)
  created(event: AccountCreatedEvent): void {
    this.balance = event.initialBalance;
  }

  @OnEvent(AccountDebitedEvent)
  debited(event: AccountDebitedEvent): void {
    this.balance -= event.amount;
  }

  @OnMessage(DebitAccountCommand)
  debitAccount(cmd: DebitAccountCommand): [AccountDebitedEvent] {
    return [new AccountDebitedEvent(cmd.amount, cmd.transactionId)];
  }

  @OnMessage(CreateAccountCommand)
  create(cmd: CreateAccountCommand): [AccountCreatedEvent] {
    return [new AccountCreatedEvent(cmd.initialBalance)];
  }
}

@SnapshotStrategy(Account, AccountSnapshot)
export class AccountSnapshotStrategy
  implements NestSnapshotStrategy<Account, AccountSnapshot> {
  constructor(private readonly aggregates: Aggregates) {}

  possibleSnapshot(
    aggregate: Account,
    oldEvents: readonly EventWithMetadata<any>[],
    newEvents: readonly any[],
    version?: string,
  ): AccountSnapshot | undefined {
    return new AccountSnapshot(aggregate.balance);
  }

  async recreateAggregate(
    aggregateType: Type<Account>,
    snapshot: AccountSnapshot,
  ): Promise<Account> {
    const aggregate = new Account({});
    const events = await aggregate.process(
      new CreateAccountCommand(snapshot.balance),
    );
    await this.aggregates.applyEvents(aggregate, events);
    return aggregate;
  }
}
