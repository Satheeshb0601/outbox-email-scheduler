import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export async function initDB(): Promise<void> {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        password_hash VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Slack connections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS slack_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        team_id VARCHAR(255) NOT NULL,
        team_name VARCHAR(255),
        access_token TEXT NOT NULL,
        bot_user_id VARCHAR(255),
        channel_id VARCHAR(255),
        channel_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, team_id)
      )
    `);

    // Scheduled emails table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        from_email VARCHAR(255) NOT NULL,
        to_emails TEXT[] NOT NULL,
        subject VARCHAR(1000) NOT NULL,
        body TEXT NOT NULL,
        body_html TEXT,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        delay_between_emails_ms INTEGER DEFAULT 1000,
        hourly_limit INTEGER DEFAULT 100,
        status VARCHAR(50) DEFAULT 'scheduled',
        bull_job_id VARCHAR(255),
        sent_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        message_id VARCHAR(255),
        preview_url TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Sent emails log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sent_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scheduled_email_id UUID REFERENCES scheduled_emails(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        from_email VARCHAR(255) NOT NULL,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(1000) NOT NULL,
        body TEXT NOT NULL,
        body_html TEXT,
        message_id VARCHAR(255),
        preview_url TEXT,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'sent',
        error_message TEXT
      )
    `);

    // Rate limit tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        sender_email VARCHAR(255) NOT NULL,
        window_start TIMESTAMP WITH TIME ZONE NOT NULL,
        window_end TIMESTAMP WITH TIME ZONE NOT NULL,
        email_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, sender_email, window_start)
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_id ON scheduled_emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_at ON scheduled_emails(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id ON sent_emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at);
    `);

    console.log('✅ Database tables created/verified');
  } finally {
    client.release();
  }
}
