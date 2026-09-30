import { Router, Request, Response } from 'express';
import { pool } from '../db/database';
import { searchEmails } from '../db/elasticsearch';
import { isAuthenticated } from './auth';

const router = Router();

// GET /api/emails/scheduled - List scheduled emails
router.get('/scheduled', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    const { page = '1', limit = '20', search } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let emails;
    let total;

    if (search && typeof search === 'string' && search.trim()) {
      // Use Elasticsearch for search
      const esResult = await searchEmails(user.id, search, offset, parseInt(limit as string));
      const ids = esResult.hits.map(h => h._id);
      total = esResult.total;

      if (ids.length === 0) {
        return res.json({ emails: [], total: 0, page: parseInt(page as string) });
      }

      const result = await pool.query(
        `SELECT * FROM scheduled_emails WHERE id = ANY($1) ORDER BY scheduled_at DESC`,
        [ids]
      );
      emails = result.rows;
    } else {
      // Direct DB query
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM scheduled_emails WHERE user_id = $1 AND status IN ('scheduled', 'rescheduled')`,
        [user.id]
      );
      total = parseInt(countResult.rows[0].count);

      const result = await pool.query(
        `SELECT * FROM scheduled_emails 
         WHERE user_id = $1 AND status IN ('scheduled', 'rescheduled')
         ORDER BY scheduled_at ASC
         LIMIT $2 OFFSET $3`,
        [user.id, parseInt(limit as string), offset]
      );
      emails = result.rows;
    }

    res.json({
      emails,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch scheduled emails' });
  }
});

// GET /api/emails/sent - List sent emails
router.get('/sent', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    const { page = '1', limit = '20', search } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sent_emails WHERE user_id = $1`,
      [user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    let whereClause = 'WHERE user_id = $1';
    const params: (string | number)[] = [user.id];

    if (search && typeof search === 'string') {
      whereClause += ` AND (subject ILIKE $${params.length + 1} OR to_email ILIKE $${params.length + 1} OR from_email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    const result = await pool.query(
      `SELECT * FROM sent_emails ${whereClause} ORDER BY sent_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit as string), offset]
    );

    res.json({
      emails: result.rows,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
});

// GET /api/emails/:id - Get email details
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM scheduled_emails WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({ email: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// GET /api/emails/counts - Get email counts for sidebar
router.get('/counts/summary', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };

    const [scheduledCount, sentCount] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM scheduled_emails WHERE user_id = $1 AND status IN ('scheduled', 'rescheduled')`,
        [user.id]
      ),
      pool.query(
        `SELECT COUNT(*) FROM sent_emails WHERE user_id = $1`,
        [user.id]
      ),
    ]);

    res.json({
      scheduled: parseInt(scheduledCount.rows[0].count),
      sent: parseInt(sentCount.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch counts' });
  }
});

export default router;
