import { UnrecoverableError } from 'bullmq';

/**
 * Thrown by a job processor for input/state that will never succeed no
 * matter how many times it's retried (invalid arguments, a user/track that
 * doesn't exist, a constraint violation caused by bad data). Extending
 * BullMQ's own UnrecoverableError means the worker moves the job straight
 * to failed regardless of remaining `attempts`, instead of burning through
 * the retry budget on something retrying can't fix. Anything else thrown
 * from a processor is treated as transient and retried with backoff as
 * configured on the queue (see `src/jobs/queue.ts`).
 */
export class PermanentJobError extends UnrecoverableError {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentJobError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
