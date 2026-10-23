import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function setup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to Neon PostgreSQL DB.');

  await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  console.log('✅ uuid-ossp extension enabled.');

  await client.query('CREATE EXTENSION IF NOT EXISTS "postgis";');
  console.log('✅ postgis extension enabled.');

  await client.end();
  console.log('Setup finished.');
}

setup().catch((err) => {
  console.error('Setup error:', err);
  process.exit(1);
});
