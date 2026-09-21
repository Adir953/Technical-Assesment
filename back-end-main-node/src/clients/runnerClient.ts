import axios from 'axios';
import { env } from '../config/env';
import type { ProgrammingLanguage } from '../types/submission';


export interface RunnerTestCase {
  input: string;
  expectedOutput: string;
  isVisible: boolean;
}

export interface RunnerRequest {
  questionId: number;
  language: ProgrammingLanguage;
  code: string;
  templateCode: string;
  testCases: RunnerTestCase[];
}

export type ExecutionStatus =
  | 'SUCCESS'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED';

export interface ExecutionResult {
  status: ExecutionStatus;
  output?: string;
  error?: string;
  testResults?: Array<{
    testCaseIndex: number;
    input: string;
    expectedOutput: string;
    actualOutput?: string;
    passed: boolean;
    error?: string;
  }>;
  passedTests?: number;
  totalTests?: number;
}

const RUNNER_URLS: Record<ProgrammingLanguage, string> = {
  python: env.runners.python,
  javascript: env.runners.javascript,
  java: env.runners.java,
};

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
