import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { checkConnection } from './db';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
// Sin CORS: el front llama a /api desde su mismo origen (proxy de ng serve o nginx).
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', apiRoutes);

app.use(errorHandler);

async function start() {
  await checkConnection();
  console.log(`Database connected: ${env.database.host}:${env.database.port}/${env.database.name}`);

  app.listen(env.port, () => {
    console.log(`Backend API running on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start Backend API', error);
  process.exit(1);
});
