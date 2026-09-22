import { Request, Response } from 'express';
import * as executionService from '../services/executionService';
import { canonicalJson } from '../utils/json';

/**
 * Ejecuta el código del candidato contra los casos de prueba recibidos. Responde el estado
 * general (el del primer caso que falla) y el resultado de cada caso en el mismo orden recibido.
 */
export async function run(req: Request, res: Response) {
  try {
    const { code, templateCode, testCases } = req.body ?? {};

    if (!code || !templateCode || !Array.isArray(testCases)) {
      return res.status(400).json({
        status: 'COMPILE_ERROR',
        error: 'Missing required fields or invalid testCases format',
      });
    }

    const result = await executionService.execute({
      code,
      templateCode,
      testCases: testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: canonicalJson(tc.expectedOutput ?? tc.expected) as string,
        isVisible: tc.isVisible ?? true,
      })),
    });

    return res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    return res.status(500).json({
      status: 'RUNTIME_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
