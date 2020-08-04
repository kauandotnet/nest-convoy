import { Message } from '@nest-convoy/messaging/common';
import {
  RuntimeException,
  UnsupportedOperationException,
} from '@nest-convoy/core';
import { ReplyMessageHeaders } from '@nest-convoy/commands/common';

import { SagaActions, SagaActionsBuilder } from '../saga-actions';
import { SagaDefinition } from '../saga-definition';

import { SagaStep, SagaStepReplyHandler } from './saga-step';
import { SagaExecutionState } from './saga-execution-state';
import { StepToExecute } from './step-to-execute';
import {
  decodeExecutionState,
  encodeExecutionState,
} from './saga-execution-state-json-serde';

export class SimpleSagaDefinition<Data> implements SagaDefinition<Data> {
  constructor(private readonly sagaSteps: SagaStep<Data>[]) {}

  private nextStepToExecute(
    { compensating, currentlyExecuting }: SagaExecutionState,
    data: Data,
  ): StepToExecute<Data> {
    const direction = compensating ? -1 : +1;
    let skipped = 0;

    for (
      let i = currentlyExecuting + direction;
      i >= 0 && i < this.sagaSteps.length;
      i = i + direction
    ) {
      const step = this.sagaSteps[i];
      if (compensating ? step.hasCompensation(data) : step.hasAction(data)) {
        return new StepToExecute<Data>(skipped, compensating, step);
      } else {
        skipped++;
      }
    }

    return new StepToExecute<Data>(skipped, compensating);
  }

  private executeNextStep(
    sagaData: Data,
    currentState: SagaExecutionState,
  ): SagaActions<Data> {
    const stepToExecute = this.nextStepToExecute(currentState, sagaData);

    return stepToExecute.isEmpty()
      ? this.makeEndStateSagaActions(currentState)
      : stepToExecute.executeStep(sagaData, currentState);
  }

  private makeEndStateSagaActions(
    currentState: SagaExecutionState,
  ): SagaActions<Data> {
    return new SagaActionsBuilder<Data>()
      .withUpdatedState(encodeExecutionState(SagaExecutionState.makeEndState()))
      .withIsEndState(true)
      .withIsCompensating(currentState.compensating)
      .build();
  }

  private invokeReplyHandler(
    message: Message,
    data: Data,
    replyHandler: SagaStepReplyHandler<Data>,
  ): void {
    // TODO - eventuate-tram-sagas-orchestration-simple-dsl/src/main/java/io/eventuate/tram/sagas/simpledsl/SimpleSagaDefinition.java
    // const className = message.getRequiredHeader(ReplyMessageHeaders.REPLY_TYPE);
    replyHandler(data, JSON.parse(message.getPayload()));
  }

  start(sagaData: Data): SagaActions<Data> {
    const currentState = new SagaExecutionState();
    return this.executeNextStep(sagaData, currentState);
  }

  handleReply(
    currentState: string,
    sagaData: Data,
    message: Message,
  ): SagaActions<Data> {
    const state = decodeExecutionState(currentState);
    const currentStep = this.sagaSteps[state.currentlyExecuting];
    if (!currentStep) {
      throw new RuntimeException();
    }

    const replyHandler = currentStep.getReplyHandler(
      message,
      state.compensating,
    );
    if (replyHandler) {
      this.invokeReplyHandler(
        message,
        sagaData,
        replyHandler.bind(currentStep),
      );
    }

    if (currentStep.isSuccessfulReply(state.compensating, message)) {
      return this.executeNextStep(sagaData, state);
    } else if (state.compensating) {
      throw new UnsupportedOperationException('Failure when compensating');
    } else {
      return this.executeNextStep(sagaData, state.startCompensating());
    }
  }
}