import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/database';
import { emailQueue, scheduleEmailJob, cancelEmailJob, EmailJobData } from '../queues/emailQueue';
import { indexEmail } from '../db/elasticsearch';
import { isAuthenticated } from './auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/scheduler/schedule - Schedule emails from a CSV/list
router.post('/schedule', isAuthenticated, upload.single('recipientList'), async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string; email: string };
    const {
      fromEmail,
      subject,
      body,
      bodyHtml,
      scheduledAt,
      delayBetweenEmailsMs,
      hourlyLimit,
      recipients: recipientsJson,
    } = req.body;

    if (!fromEmail || !subject || !body || !scheduledAt) {
      return res.status(400).json({ error: 'fromEmail, subject, body, and scheduledAt are required' });
    }

    // Parse recipients: from JSON body or CSV file
    let toEmails: string[] = [];

    if (recipientsJson) {
      try {
        toEmails = JSON.parse(recipientsJson);
      } catch {
        return res.status(400).json({ error: 'Invalid recipients JSON' });
      }
    } else if (req.file) {
      // Parse CSV file
      const content = req.file.buffer.toString('utf-8');
      try {
        const records = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        toEmails = records.map((r: Record<string, string>) =>
          r.email || r.Email || r.EMAIL || Object.values(r)[0]
        ).filter(Boolean);
      } catch {
        // Try plain text (one email per line)
        toEmails = content.split('\n').map(line => line.trim()).filter(line =>
          line.includes('@')
        );
      }
    }

    if (toEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found' });
    }

    const scheduledDate = new Date(scheduledAt);
    const delay = parseInt(delayBetweenEmailsMs || '1000');
    const limit = parseInt(hourlyLimit || '100');

    // Create one scheduled_email record per recipient
    const scheduledEmails = [];

    for (let i = 0; i < toEmails.length; i++) {
      const toEmail = toEmails[i];
      const emailId = uuidv4();
      const jobId = `email-${emailId}`;

      // Calculate scheduled time with per-email delay
      const emailScheduledAt = new Date(scheduledDate.getTime() + i * delay);

      const result = await pool.query(
        `INSERT INTO scheduled_emails 
         (id, user_id, from_email, to_emails, subject, body, body_html, scheduled_at, delay_between_emails_ms, hourly_limit, status, bull_job_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', $11)
         RETURNING *`,
        [emailId, user.id, fromEmail, [toEmail], subject, body, bodyHtml || null, emailScheduledAt.toISOString(), delay, limit, jobId]
      );

      const scheduledEmail = result.rows[0];

      // Schedule BullMQ job
      const jobData: EmailJobData = {
        scheduledEmailId: emailId,
        userId: user.id,
        fromEmail,
        toEmail,
        subject,
        body,
        bodyHtml: bodyHtml || undefined,
        delayBetweenEmailsMs: delay,
        hourlyLimit: limit,
        batchIndex: i,
        totalInBatch: toEmails.length,
      };

      await scheduleEmailJob(jobData, emailScheduledAt, jobId);

      // Index in Elasticsearch
      await indexEmail({
        id: emailId,
        user_id: user.id,
        from_email: fromEmail,
        to_emails: [toEmail],
        subject,
        body,
        status: 'scheduled',
        scheduled_at: emailScheduledAt.toISOString(),
        created_at: new Date().toISOString(),
      });

      scheduledEmails.push(scheduledEmail);
    }

    res.status(201).json({
      message: `${toEmails.length} email(s) scheduled successfully`,
      count: toEmails.length,
      scheduledEmails: scheduledEmails.slice(0, 5), // Return first 5 for brevity
    });
  } catch (error) {
    console.error('Schedule email error:', error);
    res.status(500).json({ error: 'Failed to schedule emails' });
  }
});

// DELETE /api/scheduler/:id - Cancel a scheduled email
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM scheduled_emails WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scheduled email not found' });
    }

    const email = result.rows[0];

    if (email.status !== 'scheduled') {
      return res.status(400).json({ error: `Cannot cancel email with status: ${email.status}` });
    }

    // Cancel BullMQ job
    if (email.bull_job_id) {
      await cancelEmailJob(email.bull_job_id);
    }

    // Update status in DB
    await pool.query(
      `UPDATE scheduled_emails SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Email cancelled successfully' });
  } catch (error) {
    console.error('Cancel email error:', error);
    res.status(500).json({ error: 'Failed to cancel email' });
  }
});

// GET /api/scheduler/stats - Get queue stats
router.get('/stats', isAuthenticated, async (_req: Request, res: Response) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount(),
    ]);

    res.json({ waiting, active, completed, failed, delayed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

export default router;
