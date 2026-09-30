import { Router, Request, Response } from 'express';
import { pool } from '../db/database';
import { isAuthenticated } from './auth';
import { exchangeSlackCode, getSlackChannels } from '../services/slack';

const router = Router();

// GET /auth/slack/connect - Initiate Slack OAuth
router.get('/connect', isAuthenticated, (_req: Request, res: Response) => {
  const scopes = [
    'channels:read',
    'chat:write',
    'incoming-webhook',
    'groups:read',
    'im:read',
  ].join(',');

  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?` +
    `client_id=${process.env.SLACK_CLIENT_ID}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(process.env.SLACK_REDIRECT_URI || '')}`;

  res.redirect(slackOAuthUrl);
});

// GET /auth/slack/callback - Handle Slack OAuth callback
router.get('/callback', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?slack_error=${error}`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?slack_error=no_code`);
    }

    const user = req.user as { id: string };
    const slackData = await exchangeSlackCode(code);

    // Save/update Slack connection
    await pool.query(
      `INSERT INTO slack_connections (user_id, team_id, team_name, access_token, bot_user_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, team_id) DO UPDATE
       SET access_token = $4, team_name = $3, updated_at = NOW()`,
      [user.id, slackData.teamId, slackData.teamName, slackData.accessToken, slackData.botUserId]
    );

    res.redirect(`${process.env.FRONTEND_URL}/settings?slack_connected=true&team=${encodeURIComponent(slackData.teamName)}`);
  } catch (error) {
    console.error('Slack OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?slack_error=oauth_failed`);
  }
});

// GET /auth/slack/status - Get user's Slack connection status
router.get('/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };

    const result = await pool.query(
      `SELECT id, team_id, team_name, channel_id, channel_name, created_at FROM slack_connections WHERE user_id = $1`,
      [user.id]
    );

    res.json({
      connected: result.rows.length > 0,
      connections: result.rows,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Slack status' });
  }
});

// GET /auth/slack/channels - Get Slack channels for the user
router.get('/channels', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };

    const result = await pool.query(
      `SELECT access_token FROM slack_connections WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No Slack connection found' });
    }

    const channels = await getSlackChannels(result.rows[0].access_token);
    res.json({ channels });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Slack channels' });
  }
});

// PUT /auth/slack/channel - Set notification channel
router.put('/channel', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    const { channelId, channelName } = req.body;

    await pool.query(
      `UPDATE slack_connections SET channel_id = $1, channel_name = $2, updated_at = NOW() WHERE user_id = $3`,
      [channelId, channelName, user.id]
    );

    res.json({ message: 'Notification channel updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// DELETE /auth/slack/disconnect - Disconnect Slack
router.delete('/disconnect', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as { id: string };
    await pool.query('DELETE FROM slack_connections WHERE user_id = $1', [user.id]);
    res.json({ message: 'Slack disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

export default router;
