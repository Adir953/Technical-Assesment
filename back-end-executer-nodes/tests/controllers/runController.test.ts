import { run } from '../../src/controllers/runController';
import * as executionService from '../../src/services/executionService';
import type { ExecutionResult } from '../../src/types/execution';
import { mockHttp } from '../helpers/http';

jest.mock('../../src/services/executionService', () => ({ execute: jest.fn() }));

describe('runController.run', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GIVEN una petición sin código inicial, WHEN se llama a run, THEN responde 400 con COMPILE_ERROR sin ejecutar el código', async () => {
    const { req, res } = mockHttp({ code: 'def f(x):\n    return x\n', testCases: [] });

    await run(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'COMPILE_ERROR' }));
    expect(executionService.execute).not.toHaveBeenCalled();
  });

  it('GIVEN una salida esperada con espacios, WHEN se llama a run, THEN la normaliza a JSON compacto antes de ejecutar', async () => {
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

  it('GIVEN un ejecutor que falla, WHEN se llama a run, THEN responde 500 con RUNTIME_ERROR y el mensaje del error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(executionService.execute).mockRejectedValue(new Error('spawn javac ENOENT'));
    const { req, res } = mockHttp({ code: 'x', templateCode: 'y', testCases: [] });

    await run(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ status: 'RUNTIME_ERROR', error: 'spawn javac ENOENT' });
  });
});
