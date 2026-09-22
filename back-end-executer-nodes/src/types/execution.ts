export type Runtime = 'python' | 'node' | 'java';

export type ExecutionStatus =
  | 'SUCCESS'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED';

export interface TestCase {
  input: string;
  expectedOutput: string;
  isVisible: boolean;
}

export interface RunRequest {
  code: string;
  templateCode: string;
  testCases: TestCase[];
}

export interface TestResult {
  testCaseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed: boolean;
  error?: string;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  output?: string;
  error?: string;
  testResults?: TestResult[];
  passedTests?: number;
  totalTests?: number;
}

export type Executor = (
  userCode: string,
  templateCode: string,
  testCases: TestCase[],
  timeoutMs: number
) => Promise<ExecutionResult>;

/** Resultado de un proceso lanzado en el sandbox. */
export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  outputExceeded: boolean;
  spawnError?: string;
}

/** Resultado de un caso de prueba ya comparado con la salida esperada. */
export interface TestOutcome {
  status: Exclude<ExecutionStatus, 'COMPILE_ERROR'>;
  output?: string;
  passed: boolean;
  error?: string;
}

/** Firma del método que se llama en Java, p. ej. `int findMax(int[] arr)`. */
export interface JavaSignature {
  name: string;
  paramTypes: string[];
}
