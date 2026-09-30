import { Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
dotenv.config();
import { redisConnection } from '../config/redis';
import { sendEmail } from '../config/mailer';
import { pool } from '../db/database';
import { indexEmail, updateEmailStatus } from '../db/elasticsearch';
import { EMAIL_QUEUE_NAME, EmailJobData } from '../queues/emailQueue';
import { checkRateLimit, incrementRateCount, scheduleForNextWindow } from '../services/rateLimiter';
import { sendSlackNotification } from '../services/slack';

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '1000');

const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const {
      scheduledEmailId,
      userId,
      fromEmail,
      toEmail,
      subject,
      body,
      bodyHtml,
      hourlyLimit,
      batchIndex,
    } = job.data;

    console.log(`📧 Processing email job ${job.id}: ${fromEmail} → ${toEmail}`);

    // Check hourly rate limit
    const { allowed, remaining, resetAt } = await checkRateLimit(userId, fromEmail, hourlyLimit);

    if (!allowed) {
      console.log(`⏱️ Rate limit hit for ${fromEmail}. Rescheduling to next window...`);

      // Send Slack notification
      await sendSlackNotification(userId,
        `⚠️ Email rate limit reached for *${fromEmail}*. ` +
        `Limit: ${hourlyLimit}/hour. Next window resets at ${resetAt?.toISOString()}. ` +
        `Email to ${toEmail} has been rescheduled.`
      );

      // Reschedule to next hour window
      await scheduleForNextWindow(job.data, resetAt || new Date());

      // Update status in DB
      await pool.query(
        `UPDATE scheduled_emails SET status = 'rescheduled', updated_at = NOW() WHERE id = $1`,
        [scheduledEmailId]
      );

      return { status: 'rescheduled', reason: 'rate_limit' };
    }

    // Apply minimum delay between emails in a batch
    if (batchIndex > 0 && MIN_DELAY_MS > 0) {
      await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));
    }

    try {
      // Send email
      const result = await sendEmail({
        from: fromEmail,
        to: toEmail,
        subject,
        text: body,
        html: bodyHtml || body,
      });

      // Increment rate counter
      await incrementRateCount(userId, fromEmail);

      // Log to sent_emails table
      const sentEmailResult = await pool.query(
        `INSERT INTO sent_emails 
         (scheduled_email_id, user_id, from_email, to_email, subject, body, body_html, message_id, preview_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent')
         RETURNING id`,
        [scheduledEmailId, userId, fromEmail, toEmail, subject, body, bodyHtml, result.messageId, result.previewUrl]
      );

      // Update parent scheduled email status (only when all recipients done)
      await pool.query(
        `UPDATE scheduled_emails 
         SET status = 'sent', sent_at = NOW(), message_id = $2, preview_url = $3, updated_at = NOW()
         WHERE id = $1`,
        [scheduledEmailId, result.messageId, result.previewUrl]
      );

      // Update Elasticsearch
      await updateEmailStatus(scheduledEmailId, 'sent', new Date().toISOString());

      console.log(`✅ Email sent successfully: ${result.messageId}`);
      console.log(`   Preview: ${result.previewUrl}`);

      return {
        status: 'sent',
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        sentEmailId: sentEmailResult.rows[0].id,
        remaining,
      };
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`❌ Failed to send email: ${errorMsg}`);

      // Update status to failed
      await pool.query(
        `UPDATE scheduled_emails 
         SET status = 'failed', error_message = $2, updated_at = NOW()
         WHERE id = $1`,
        [scheduledEmailId, errorMsg]
      );

      await updateEmailStatus(scheduledEmailId, 'failed');

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: WORKER_CONCURRENCY,
  }
);

worker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result?.status);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log(`🚀 Email worker started with concurrency: ${WORKER_CONCURRENCY}`);

export default worker;
