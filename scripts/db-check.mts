/**
 * Connectivity check for the Neon database.
 * Run with: npx tsx scripts/db-check.mts
 */
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (looked in .env)');
  process.exit(1);
}

console.log('host:', new URL(url).hostname);

let ok = 0;
for (let i = 1; i <= 3; i++) {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 20000,
    query_timeout: 20000,
  });
  const started = Date.now();
  try {
    await client.connect();
    const res = await client.query('select count(*)::int as n from users');
    console.log(`attempt ${i}: OK in ${Date.now() - started}ms — users rows: ${res.rows[0].n}`);
    ok++;
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    console.log(`attempt ${i}: FAIL in ${Date.now() - started}ms — ${e.code ?? e.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

console.log(ok === 3 ? '\nAll good.' : `\n${ok}/3 succeeded — connection still unstable.`);
process.exit(ok > 0 ? 0 : 1);
