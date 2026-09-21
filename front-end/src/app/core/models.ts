// Tipos que reflejan las respuestas del backend (back-end-main-node/src/types).

export type ProgrammingLanguage = 'python' | 'javascript' | 'java';

export type ExecutionStatus =
  | 'SUCCESS'
  | 'WRONG_ANSWER'
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED';

export interface Assessment {
  id: number;
  createdBy: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  totalQuestions: number;
  createdAt: string | null;
}

export interface Question {
  id: number;
  createdBy: number;
  title: string;
  description: string;
  points: number;
  createdAt: string | null;
}

export interface OrderedQuestion extends Question {
  questionOrder: number;
}

export interface AssessmentDetail extends Assessment {
  questions: OrderedQuestion[];
  totalPossiblePoints: number;
}

export interface TestCase {
  id: number;
  questionId: number;
  inputValue: string;
  expectedOutput: string;
  isVisible: boolean | null;
}

export interface QuestionDetail extends Question {
  // Las claves presentes son los lenguajes permitidos para la pregunta.
  starterCodes: Partial<Record<ProgrammingLanguage, string>>;
  testCases: TestCase[];
}

export interface AssessmentSubmission {
  id: number;
  studentId: number;
  assessmentId: number;
  finalScore: number | null;
  totalPossiblePoints: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TestCaseResult {
  id: number;
  questionSubmissionId: number;
  testCaseId: number;
  inputValue: string;
  expectedOutput: string;
  actualOutput: string | null;
  isPassed: boolean;
  errorMessage: string | null;
}

export interface QuestionSubmission {
  id: number;
  assessmentSubmissionId: number;
  questionId: number;
  studentCode: string;
  programmingLanguage: ProgrammingLanguage;
  score: number | null;
  passedTests: number | null;
  totalTests: number | null;
  compilationError: string | null;
  executionOutput: string | null;
  submittedAt: string | null;
}

export interface SubmissionDetail extends AssessmentSubmission {
  // Ordenadas de la más reciente a la más antigua.
  questionSubmissions: Array<QuestionSubmission & { question: Question; testCaseResults: TestCaseResult[] }>;
}

export interface SolutionResult {
  questionSubmission: QuestionSubmission;
  status: ExecutionStatus;
  testCaseResults: TestCaseResult[];
}

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

export interface CreateQuestionInput {
  createdBy: number;
  title: string;
  description: string;
  points: number;
  // Las claves presentes definen los lenguajes permitidos.
  starterCodes: Partial<Record<ProgrammingLanguage, string>>;
  testCases: Array<{ inputValue: string; expectedOutput: string; isVisible: boolean }>;
}

export interface CreateAssessmentInput {
  createdBy: number;
  title: string;
  description?: string;
  durationMinutes: number;
  // El orden del arreglo define el orden de las preguntas.
  questionIds: number[];
}

export interface ApiErrorBody {
  error: { status: number; message: string; timestamp: string };
}
