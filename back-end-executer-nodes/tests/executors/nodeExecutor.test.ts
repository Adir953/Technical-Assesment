import { executeJavaScript } from '../../src/executors/nodeExecutor';
import type { TestCase } from '../../src/types/execution';

// Estas pruebas lanzan procesos reales de Node (sin usuario sandbox fuera de Docker).
jest.setTimeout(20000);

const template = 'function findMax(arr) {\n  // Escribe tu solución aquí\n}\n';
const cases: TestCase[] = [
  { input: '[[3, 5, 1, 8, 2]]', expectedOutput: '8', isVisible: true },
  { input: '[[-5, -2, -10]]', expectedOutput: '-2', isVisible: false },
];

describe('executeJavaScript', () => {
  it('califica una solución correcta', async () => {
    const result = await executeJavaScript(
      'function findMax(arr) {\n  return Math.max(...arr);\n}\n',
      template,
      cases
    );

    expect(result).toMatchObject({ status: 'SUCCESS', passedTests: 2, totalTests: 2 });
  });

  it('devuelve WRONG_ANSWER con la salida obtenida', async () => {
    const result = await executeJavaScript('function findMax(arr) {\n  return arr[0];\n}\n', template, cases);

    expect(result.status).toBe('WRONG_ANSWER');
    expect(result.testResults?.[0]).toMatchObject({ actualOutput: '3', passed: false });
  });

  it('reporta un error de sintaxis como COMPILE_ERROR', async () => {
    const result = await executeJavaScript('function findMax(arr) {\n  return arr[0\n}\n', template, cases);

    expect(result.status).toBe('COMPILE_ERROR');
    expect(result.error).toContain('solution.js');
    expect(result.passedTests).toBe(0);
  });

  it('reporta una excepción como RUNTIME_ERROR', async () => {
    const result = await executeJavaScript(
      'function findMax(arr) {\n  throw new Error("arreglo vacío");\n}\n',
      template,
      cases
    );

    expect(result.status).toBe('RUNTIME_ERROR');
    expect(result.error).toContain('arreglo vacío');
  });
});
