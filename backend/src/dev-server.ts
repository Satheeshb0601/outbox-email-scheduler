/**
 * dev-server.ts - Development entry point that starts embedded PostgreSQL
 * then launches the main Express server.
 * 
 * Run with: npx ts-node src/dev-server.ts
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PG_DATA_DIR = path.join(__dirname, '..', '.pg-data');

async function startEmbeddedPostgres() {
  const pg = new EmbeddedPostgres({
    databaseDir: PG_DATA_DIR,
    user: 'outbox_user',
    password: 'outbox_pass',
    port: 5432,
    persistent: true,
  });

  try {
    await pg.initialise();
    await pg.start();

    // Create database if it doesn't exist
    const client = pg.getPgClient();
    await client.connect();
    try {
      await client.query(`
        SELECT 'CREATE DATABASE outbox_db'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'outbox_db')
      `).then(async (res) => {
        if (res.rows.length > 0) {
          await client.query('CREATE DATABASE outbox_db');
          console.log('✅ Created database outbox_db');
        }
      });
    } catch (e) {
      // Database might already exist
    } finally {
      await client.end();
    }

    console.log('✅ Embedded PostgreSQL started on port 5432');
    return pg;
  } catch (error) {
    console.log('ℹ️ PostgreSQL already running or using external instance');
    return null;
  }
}

async function main() {
  // Try to start embedded postgres (will skip if already running externally)
  const pg = await startEmbeddedPostgres().catch(err => {
    console.log('⚠️ Could not start embedded PG, assuming external PG:', err.message);
    return null;
  });

  // Now import and start the main server
  // Dynamic require to ensure env is loaded first
  await import('./index');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    if (pg) await pg.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    if (pg) await pg.stop();
    process.exit(0);
  });
}

main().catch(console.error);
