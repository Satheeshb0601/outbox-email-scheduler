import axios from 'axios';
import { pool } from '../db/database';

export async function sendSlackNotification(userId: string, message: string): Promise<void> {
  try {
    // Get user's Slack connection
    const result = await pool.query(
      `SELECT access_token, channel_id FROM slack_connections WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      console.log('⚠️ No Slack connection found for user, skipping notification');
      return;
    }

    const { access_token, channel_id } = result.rows[0];
    const channelToUse = channel_id || '#general';

    await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel: channelToUse,
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Slack notification sent to ${channelToUse}`);
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error);
  }
}

export async function exchangeSlackCode(code: string): Promise<{
  teamId: string;
  teamName: string;
  accessToken: string;
  botUserId: string;
}> {
  const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
    params: {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI,
    },
  });

  const data = response.data;
  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error}`);
  }

  return {
    teamId: data.team.id,
    teamName: data.team.name,
    accessToken: data.access_token,
    botUserId: data.bot_user_id || '',
  };
}

export async function getSlackChannels(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const response = await axios.get('https://slack.com/api/conversations.list', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      types: 'public_channel,private_channel',
      limit: 200,
    },
  });

  if (!response.data.ok) {
    throw new Error(`Failed to get channels: ${response.data.error}`);
  }

  return (response.data.channels || []).map((ch: { id: string; name: string }) => ({
    id: ch.id,
    name: ch.name,
  }));
}
