import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? 'technical_assessment_platform',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
  },
  runners: {
    python: process.env.PYTHON_RUNNER_URL ?? 'http://python-runner:8000/run',
    javascript: process.env.NODE_RUNNER_URL ?? 'http://node-runner:8000/run',
    java: process.env.JAVA_RUNNER_URL ?? 'http://java-runner:8000/run',
  },
};

const { user, password, host, port, name } = env.database;

export const databaseUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
  password
)}@${host}:${port}/${name}`;
