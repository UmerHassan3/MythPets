import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' });

export default defineConfig({
  out: './drizzle',
  schema: './Database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations run through the session pooler: drizzle-kit takes advisory
    // locks, which need a connection that persists across statements. The app
    // itself uses the transaction pooler, which hands the connection back
    // after every statement and so cannot hold one.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
