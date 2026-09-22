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
  it('GIVEN una salida igual a la esperada con salto de línea final, WHEN se evalúa, THEN el caso pasa con SUCCESS', () => {
    expect(evaluateRun(processResult({ stdout: '8\n' }), '8')).toMatchObject({
      status: 'SUCCESS',
      passed: true,
      output: '8',
    });
  });

  it('GIVEN una salida distinta a la esperada, WHEN se evalúa, THEN marca WRONG_ANSWER indicando lo esperado y lo obtenido', () => {
    expect(evaluateRun(processResult({ stdout: '7\n' }), '8')).toMatchObject({
      status: 'WRONG_ANSWER',
      passed: false,
      error: 'Expected: 8, Got: 7',
    });
  });

  it('GIVEN un proceso que superó el tiempo límite, WHEN se evalúa, THEN reporta TIME_LIMIT_EXCEEDED antes que cualquier otro estado', () => {
    const run = processResult({ timedOut: true, exitCode: null, signal: 'SIGKILL' });

    expect(evaluateRun(run, '8').status).toBe('TIME_LIMIT_EXCEEDED');
  });

  it('GIVEN un proceso que termina con error, WHEN se evalúa, THEN reporta RUNTIME_ERROR usando stderr como mensaje', () => {
    const run = processResult({ exitCode: 1, stderr: 'ZeroDivisionError: division by zero\n' });

    expect(evaluateRun(run, '8')).toMatchObject({
      status: 'RUNTIME_ERROR',
      error: 'ZeroDivisionError: division by zero',
    });
  });
});
