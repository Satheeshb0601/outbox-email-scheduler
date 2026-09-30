import { pool } from '../db/database';
import { redisConnection } from '../config/redis';
import { emailQueue, EmailJobData } from '../queues/emailQueue';
import { v4 as uuidv4 } from 'uuid';

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour in ms

export async function checkRateLimit(
  userId: string,
  senderEmail: string,
  hourlyLimit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date | null }> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / RATE_WINDOW_MS) * RATE_WINDOW_MS);
  const windowEnd = new Date(windowStart.getTime() + RATE_WINDOW_MS);

  // Use Redis for fast rate limit check
  const redisKey = `rate:${userId}:${senderEmail}:${windowStart.getTime()}`;
  const currentCount = await redisConnection.get(redisKey);
  const count = parseInt(currentCount || '0');

  if (count >= hourlyLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
    };
  }

  return {
    allowed: true,
    remaining: hourlyLimit - count,
    resetAt: windowEnd,
  };
}

export async function incrementRateCount(userId: string, senderEmail: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / RATE_WINDOW_MS) * RATE_WINDOW_MS);
  const ttlSeconds = Math.ceil(RATE_WINDOW_MS / 1000);

  const redisKey = `rate:${userId}:${senderEmail}:${windowStart.getTime()}`;
  
  const pipeline = redisConnection.pipeline();
  pipeline.incr(redisKey);
  pipeline.expire(redisKey, ttlSeconds);
  await pipeline.exec();

  // Also update PostgreSQL for persistence
  await pool.query(
    `INSERT INTO email_rate_limits (user_id, sender_email, window_start, window_end, email_count)
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (user_id, sender_email, window_start)
     DO UPDATE SET email_count = email_rate_limits.email_count + 1`,
    [userId, senderEmail, windowStart.toISOString(), new Date(windowStart.getTime() + RATE_WINDOW_MS).toISOString()]
  );
}

export async function scheduleForNextWindow(
  jobData: EmailJobData,
  resetAt: Date
): Promise<void> {
  // Add a small buffer to ensure we're in the next window
  const nextWindowTime = new Date(resetAt.getTime() + 5000);
  const delay = Math.max(0, nextWindowTime.getTime() - Date.now());

  const newJobId = `rescheduled-${uuidv4()}`;
  
  await emailQueue.add('send-email', jobData, {
    jobId: newJobId,
    delay,
  });

  console.log(`📅 Email rescheduled to ${nextWindowTime.toISOString()}`);
}
