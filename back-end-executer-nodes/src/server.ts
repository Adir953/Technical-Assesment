import express from 'express';
import { env } from './config/env';
import routes from './routes';

const app = express();

// Only backend-api calls the runner (no browser, so no CORS), and a submission is small.
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', runtime: env.runtime });
});

app.use(routes);

app.listen(env.port, () => {
  console.log(`${env.runtime.toUpperCase()} Runner listening on port ${env.port}`);
});
