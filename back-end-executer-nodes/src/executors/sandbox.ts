import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Usuario sin privilegios que ejecuta el código del candidato (se crea en los Dockerfile).
 * Sin SANDBOX_UID (desarrollo local fuera de Docker) el código corre con el usuario actual.
 */
const SANDBOX_UID = process.env.SANDBOX_UID ? Number(process.env.SANDBOX_UID) : undefined;
const SANDBOX_GID = process.env.SANDBOX_GID ? Number(process.env.SANDBOX_GID) : SANDBOX_UID;
const MAX_OUTPUT_BYTES = Number(process.env.MAX_OUTPUT_BYTES ?? 64 * 1024);

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  outputExceeded: boolean;
  spawnError?: string;
}

export interface TestOutcome {
  status: 'SUCCESS' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  output?: string;
  passed: boolean;
  error?: string;
}

/**
 * Directorio de trabajo de una ejecución. Lo crea el servidor y el usuario sandbox solo puede
 * leerlo: no puede modificar ni borrar los archivos generados.
 */
export function createWorkDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.chmodSync(dir, 0o755);
  return dir;
}

/**
 * Ejecuta un proceso con el código del candidato como usuario sandbox, sin las variables de
 * entorno del servidor, con tiempo y salida limitados. Al terminar elimina cualquier proceso
 * que el código haya dejado vivo.
 */
export function runSandboxed(
  command: string,
  args: string[],
  options: { cwd: string; timeoutMs: number; input?: string }
): Promise<SandboxResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      uid: SANDBOX_UID,
      gid: SANDBOX_GID,
      env: { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin', HOME: options.cwd, LANG: 'C.UTF-8' },
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let timedOut = false;
    let outputExceeded = false;

    const stop = () => {
      child.kill('SIGKILL');
      killSandboxProcesses();
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      stop();
    }, options.timeoutMs);

    const collect = (chunks: Buffer[]) => (data: Buffer) => {
      outputBytes += data.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        if (!outputExceeded) {
          outputExceeded = true;
          stop();
        }
        return;
      }
      chunks.push(data);
    };

    child.stdout.on('data', collect(stdout));
    child.stderr.on('data', collect(stderr));
    // Si el proceso termina sin leer la entrada, escribir en stdin falla con EPIPE.
    child.stdin.on('error', () => {});
    child.stdin.end(options.input ?? '');

    const result = (extra: Partial<SandboxResult>): SandboxResult => ({
      stdout: Buffer.concat(stdout).toString(),
      stderr: Buffer.concat(stderr).toString(),
      exitCode: null,
      signal: null,
      timedOut,
      outputExceeded,
      ...extra,
    });

    child.on('close', (exitCode, signal) => {
      clearTimeout(timeout);
      killSandboxProcesses();
      resolve(result({ exitCode, signal }));
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve(result({ spawnError: err.message }));
    });
  });
}

/** Compara la salida de un caso de prueba con la esperada. */
export function evaluateRun(run: SandboxResult, expectedOutput: unknown): TestOutcome {
  if (typeof expectedOutput !== 'string') {
    return { status: 'RUNTIME_ERROR', passed: false, error: 'Invalid test case: expectedOutput is missing or empty' };
  }
  if (run.timedOut) {
    return { status: 'TIME_LIMIT_EXCEEDED', output: run.stdout, passed: false, error: 'Execution time exceeded' };
  }
  if (run.outputExceeded) {
    return {
      status: 'RUNTIME_ERROR',
      passed: false,
      error: `Output limit exceeded (${Math.round(MAX_OUTPUT_BYTES / 1024)} KB)`,
    };
  }
  if (run.spawnError) {
    return { status: 'RUNTIME_ERROR', passed: false, error: run.spawnError };
  }
  if (run.signal) {
    return {
      status: 'RUNTIME_ERROR',
      output: run.stdout,
      passed: false,
      error: `Process killed by ${run.signal} (memory limit exceeded?)`,
    };
  }
  if (run.exitCode !== 0) {
    return {
      status: 'RUNTIME_ERROR',
      output: run.stdout,
      passed: false,
      error: run.stderr.trim() || `Process exited with code ${run.exitCode}`,
    };
  }

  const output = run.stdout.trim();
  const expected = expectedOutput.trim();
  const passed = output === expected;
  return {
    status: passed ? 'SUCCESS' : 'WRONG_ANSWER',
    output,
    passed,
    error: passed ? undefined : `Expected: ${expected}, Got: ${output}`,
  };
}

/**
 * Mata todos los procesos del usuario sandbox, incluidos los que el código haya lanzado en
 * segundo plano. Es seguro porque el runner atiende una ejecución a la vez (ver runner.ts).
 * Repite el barrido porque un fork bomb puede crear procesos mientras se matan los anteriores.
 */
function killSandboxProcesses(): void {
  if (SANDBOX_UID === undefined) return;
  for (let round = 0; round < 100 && killSandboxRound() > 0; round++);
}

function killSandboxRound(): number {
  let killed = 0;
  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const status = fs.readFileSync(`/proc/${entry}/status`, 'utf8');
      const uid = /^Uid:\s+(\d+)/m.exec(status)?.[1];
      if (Number(uid) === SANDBOX_UID) {
        process.kill(Number(entry), 'SIGKILL');
        killed++;
      }
    } catch {
      // El proceso ya terminó.
    }
  }
  return killed;
}
