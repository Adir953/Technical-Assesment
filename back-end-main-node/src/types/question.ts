import type { questions, testCases } from '../models';

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;

export interface QuestionDetail extends Question {
  testCases: TestCase[];
}

export interface CreateQuestionInput {
  createdBy: number;
  title: string;
  description: string;
  points: number;
  starterCode?: string;
  testCases: Array<{ inputValue: string; expectedOutput: string; isVisible?: boolean }>;
}
