
import { Queue } from 'bullmq';
import redis from './redis';
import { BullMqJobQueue } from './queue_utils';

// Normal Redis queue doesnt have a direct option to debounce the jobs, so we are using bullmq for that.
// BullMQ allows us to create a queue with a debounce option, which is useful for tasks that should not be executed too frequently.

// This queue handles Create/Update/Delete Semantics Jobs.
export const semanticsWorkerQueue = new Queue(BullMqJobQueue.SEMANTICS_QUEUE, {connection: redis});
export const persistDataWorkerQueue = new Queue(BullMqJobQueue.PERSIST_DATA_QUEUE, {connection: redis});

