import { run } from '../../src/controllers/runController';
import * as executionService from '../../src/services/executionService';
import type { ExecutionResult } from '../../src/types/execution';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/executionService', () => ({ execute: jest.fn() }));

describe('runController.run', () => {
  beforeEach(() => jest.clearAllMocks());

  it('responde 400 si falta el código inicial', async () => {
    const { req, res } = mockHttp({ code: 'def f(x):\n    return x\n', testCases: [] });

    await run(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPILE_ERROR' }));
    expect(executionService.execute).not.toHaveBeenCalled();
  });

  it('normaliza la salida esperada antes de ejecutar', async () => {
    const result: ExecutionResult = { status: 'SUCCESS', passedTests: 1, totalTests: 1 };
    jest.mocked(executionService.execute).mockResolvedValue(result);
    const { req, res } = mockHttp({
      code: 'function pair(a, b) { return [a, b]; }',
      templateCode: 'function pair(a, b) {\n}\n',
      testCases: [{ input: '[1, 2]', expectedOutput: '[ 1, 2 ]' }],
    });

    await run(req, res);

    expect(executionService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: [{ input: '[1, 2]', expectedOutput: '[1,2]', isVisible: true }],
      })
    );
    expect(res.json).toHaveBeenCalledWith(result);
  });

  it('responde 500 si el ejecutor falla', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(executionService.execute).mockRejectedValue(new Error('spawn javac ENOENT'));
    const { req, res } = mockHttp({ code: 'x', templateCode: 'y', testCases: [] });

    await run(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ status: 'RUNTIME_ERROR', error: 'spawn javac ENOENT' });
  });
});
