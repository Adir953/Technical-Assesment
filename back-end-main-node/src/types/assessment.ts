import type { assessments, assessmentQuestions } from '../models';

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type NewAssessmentQuestion = typeof assessmentQuestions.$inferInsert;

export interface CreateAssessmentInput {
  createdBy: number;
  title: string;
  description?: string;
  durationMinutes: number;
  questionIds: number[];
}

export interface OrderedQuestion {
  id: number;
  createdBy: number;
  title: string;
  description: string;
  points: number;
  createdAt: Date | null;
  questionOrder: number;
}

export interface AssessmentDetail extends Assessment {
  questions: OrderedQuestion[];
  totalPossiblePoints: number;
}
