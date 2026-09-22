import axios from 'axios';
import { env } from '../config/env';
import type { ProgrammingLanguage } from '../types/submission';
import type { ExecutionResult, RunnerRequest } from '../types/execution';

const RUNNER_URLS: Record<ProgrammingLanguage, string> = {
  python: env.runners.python,
  javascript: env.runners.javascript,
  java: env.runners.java,
};

/**
 * Envía el código al runner del lenguaje (un contenedor por lenguaje). No lanza error si el
 * runner falla: devuelve el cuerpo de su respuesta de error o un RUNTIME_ERROR si no responde,
 * así el envío del estudiante se registra igual con puntaje 0.
 */
export async function runCode(request: RunnerRequest): Promise<ExecutionResult> {
  const runnerUrl = RUNNER_URLS[request.language];

  try {
    const response = await axios.post<ExecutionResult>(runnerUrl, request);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data) {
        return error.response.data as ExecutionResult;
      }
      return {
        status: 'RUNTIME_ERROR',
        error: `Runner unavailable (${request.language}): ${error.message}`,
      };
    }
    throw error;
  }
}
