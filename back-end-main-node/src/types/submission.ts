import type {
  assessmentSubmissions,
  questionSubmissions,
  testCaseResults,
} from '../models';
import type { Question } from './question';
import type { ExecutionStatus } from './execution';

export type AssessmentSubmission = typeof assessmentSubmissions.$inferSelect;
export type NewAssessmentSubmission = typeof assessmentSubmissions.$inferInsert;
export type QuestionSubmission = typeof questionSubmissions.$inferSelect;
export type NewQuestionSubmission = typeof questionSubmissions.$inferInsert;
export type TestCaseResult = typeof testCaseResults.$inferSelect;
export type NewTestCaseResult = typeof testCaseResults.$inferInsert;
export type ProgrammingLanguage = 'python' | 'javascript' | 'java';

export interface QuestionSubmissionWithQuestion extends QuestionSubmission {
  question: Question;
}

export interface SubmissionDetail extends AssessmentSubmission {
  questionSubmissions: Array<QuestionSubmissionWithQuestion & { testCaseResults: TestCaseResult[] }>;
}

export interface SubmitSolutionInput {
  assessmentSubmissionId: number;
  questionId: number;
  code: string;
  language: ProgrammingLanguage;
}

export interface SolutionResult {
  questionSubmission: QuestionSubmission;
  status: ExecutionStatus;
  testCaseResults: TestCaseResult[];
}
