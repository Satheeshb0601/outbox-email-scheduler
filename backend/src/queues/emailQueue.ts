import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-sending';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 500 },
  },
});

export interface EmailJobData {
  scheduledEmailId: string;
  userId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  batchIndex: number;
  totalInBatch: number;
}

export async function scheduleEmailJob(
  data: EmailJobData,
  scheduledAt: Date,
  jobId: string
): Promise<string> {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());

  const job = await emailQueue.add(
    'send-email',
    data,
    {
      jobId,
      delay,
    }
  );

  return job.id || jobId;
}

export async function cancelEmailJob(jobId: string): Promise<void> {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}
