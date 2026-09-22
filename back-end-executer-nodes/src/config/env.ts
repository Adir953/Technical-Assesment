import dotenv from 'dotenv';
import type { Runtime } from '../types/execution';

dotenv.config();

const RUNTIMES: Runtime[] = ['python', 'node', 'java'];

function parseRuntime(value: string): Runtime {
  if (!RUNTIMES.includes(value as Runtime)) {
    throw new Error(`Unknown RUNTIME "${value}", expected one of: ${RUNTIMES.join(', ')}`);
  }
  return value as Runtime;
}

const sandboxUid = process.env.SANDBOX_UID ? Number(process.env.SANDBOX_UID) : undefined;

export const env = {
  port: Number(process.env.PORT ?? 8000),
  runtime: parseRuntime(process.env.RUNTIME ?? 'python'),
  // Fixed server-side so callers cannot extend how long user code may run.
  executionTimeoutMs: Number(process.env.EXECUTION_TIMEOUT_MS ?? 5000),
  sandbox: {
    // Usuario sin privilegios que ejecuta el código del candidato (se crea en los Dockerfile).
    // Sin SANDBOX_UID (desarrollo local fuera de Docker) el código corre con el usuario actual.
    uid: sandboxUid,
    gid: process.env.SANDBOX_GID ? Number(process.env.SANDBOX_GID) : sandboxUid,
    maxOutputBytes: Number(process.env.MAX_OUTPUT_BYTES ?? 64 * 1024),
  },
};
