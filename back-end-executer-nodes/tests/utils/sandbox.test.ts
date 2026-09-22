import { evaluateRun } from '../../src/utils/sandbox';
import type { SandboxResult } from '../../src/types/execution';

function processResult(overrides: Partial<SandboxResult> = {}): SandboxResult {
  return {
    stdout: '',
    stderr: '',
    exitCode: 0,
    signal: null,
    timedOut: false,
    outputExceeded: false,
    ...overrides,
  };
}

describe('evaluateRun', () => {
  it('pasa si la salida coincide, ignorando el salto de línea final', () => {
    expect(evaluateRun(processResult({ stdout: '8\n' }), '8')).toMatchObject({
      status: 'SUCCESS',
      passed: true,
      output: '8',
    });
  });

  it('marca WRONG_ANSWER indicando lo esperado y lo obtenido', () => {
    expect(evaluateRun(processResult({ stdout: '7\n' }), '8')).toMatchObject({
      status: 'WRONG_ANSWER',
      passed: false,
      error: 'Expected: 8, Got: 7',
    });
  });

  it('reporta el tiempo límite antes que cualquier otra cosa', () => {
    const run = processResult({ timedOut: true, exitCode: null, signal: 'SIGKILL' });

    expect(evaluateRun(run, '8').status).toBe('TIME_LIMIT_EXCEEDED');
  });

  it('usa stderr como mensaje cuando el proceso termina con error', () => {
    const run = processResult({ exitCode: 1, stderr: 'ZeroDivisionError: division by zero\n' });

    expect(evaluateRun(run, '8')).toMatchObject({
      status: 'RUNTIME_ERROR',
      error: 'ZeroDivisionError: division by zero',
    });
  });
});
