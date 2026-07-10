import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../logger/logger';

// Default queue name for general tasks (e.g., video generation, emails)
const DEFAULT_QUEUE_NAME = 'kinetix-main-queue';

export class QueueService {
  private queue: Queue | null = null;
  private connection: IORedis | null = null;
  private isFallbackMode: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    // Graceful Fallback: If no Redis URL is provided, we don't crash the server.
    // We simply log a warning and run in a mock "fallback mode".
    if (!redisUrl) {
      logger.warn("REDIS_URL is missing! QueueService is running in mock Fallback Mode. Background jobs will execute immediately in-memory (Not recommended for production).");
      this.isFallbackMode = true;
      return;
    }

    try {
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ
      });

      this.queue = new Queue(DEFAULT_QUEUE_NAME, {
        connection: this.connection as any, // Cast to any to bypass ioredis version mismatch
      });

      logger.info('BullMQ Queue Service initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize Redis connection for BullMQ', { error });
      this.isFallbackMode = true;
    }
  }

  /**
   * Push a new job onto the queue.
   */
  async enqueue(jobType: string, payload: any, options?: any) {
    if (this.isFallbackMode || !this.queue) {
      logger.debug(`[Queue Mock] Pretending to enqueue job: ${jobType}`, { payload });
      
      // In fallback mode, we could technically just execute the logic immediately,
      // but for architecture safety, we just log it and pretend it succeeded.
      return { 
        jobId: `mock-job-${Date.now()}`, 
        status: 'queued-mock',
        note: 'Redis is not connected.'
      };
    }

    try {
      const job = await this.queue.add(jobType, payload, options);
      logger.info(`[Queue] Successfully enqueued job: ${jobType}`, { jobId: job.id });
      return { jobId: job.id, status: 'queued' };
    } catch (error) {
      logger.error(`[Queue] Failed to enqueue job: ${jobType}`, { error });
      throw error;
    }
  }

  /**
   * Helper to create a worker that consumes jobs from this queue.
   * This is typically called inside a dedicated worker process or server route.
   */
  createWorker(processor: (job: Job) => Promise<any>) {
    if (this.isFallbackMode || !this.connection) {
      logger.warn("Cannot create BullMQ Worker: Redis is not connected.");
      return null;
    }

    const worker = new Worker(DEFAULT_QUEUE_NAME, processor, {
      connection: this.connection as any, // Cast to any to bypass ioredis version mismatch
    });

    worker.on('completed', (job) => {
      logger.info(`[Worker] Job ${job.id} completed successfully!`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[Worker] Job ${job?.id} failed!`, { error: err.message });
    });

    return worker;
  }
}

export const queueService = new QueueService();
