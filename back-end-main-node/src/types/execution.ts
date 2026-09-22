import type { ProgrammingLanguage } from './submission';

// Contrato con los runners (back-end-executer-nodes, POST /run).

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
