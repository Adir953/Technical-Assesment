import { env } from '../config/env';
import { executeJava } from '../executors/javaExecutor';
import { executeJavaScript } from '../executors/nodeExecutor';
import { executePython } from '../executors/pythonExecutor';
import type { ExecutionResult, Executor, RunRequest, Runtime } from '../types/execution';

const EXECUTORS: Record<Runtime, Executor> = {
  python: executePython,
  node: executeJavaScript,
  java: executeJava,
};

// One execution at a time: after each process the sandbox user's leftover processes are killed,
// which is only safe while no other execution is running. Scale by adding runner replicas.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => undefined);
  return result;
}

/**
 * Ejecuta el código con el ejecutor del lenguaje de este contenedor (RUNTIME). Los tres
 * contenedores usan este mismo código; el tiempo límite lo fija el servidor, no quien llama.
 */
export function execute({ code, templateCode, testCases }: RunRequest): Promise<ExecutionResult> {
  const executor = EXECUTORS[env.runtime];
  return enqueue(() => executor(code, templateCode, testCases, env.executionTimeoutMs));
}
