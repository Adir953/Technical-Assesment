import { defineConfig } from 'drizzle-kit';
import { databaseUrl } from './src/config/env';

export default defineConfig({
  schema: './src/models/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
