import { relations } from 'drizzle-orm';
import { users } from './users';
import { assessments } from './assessments';
import { questions } from './questions';
import { questionStarterCodes } from './questionStarterCodes';
import { assessmentQuestions } from './assessmentQuestions';
import { testCases } from './testCases';
import { assessmentSubmissions } from './assessmentSubmissions';
import { questionSubmissions } from './questionSubmissions';
import { testCaseResults } from './testCaseResults';

export const usersRelations = relations(users, ({ many }) => ({
  createdAssessments: many(assessments),
  createdQuestions: many(questions),
  assessmentSubmissions: many(assessmentSubmissions),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  author: one(users, {
    fields: [assessments.createdBy],
    references: [users.id],
  }),
  assessmentQuestions: many(assessmentQuestions),
  submissions: many(assessmentSubmissions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  author: one(users, {
    fields: [questions.createdBy],
    references: [users.id],
  }),
  assessmentQuestions: many(assessmentQuestions),
  starterCodes: many(questionStarterCodes),
  testCases: many(testCases),
  submissions: many(questionSubmissions),
}));

export const questionStarterCodesRelations = relations(questionStarterCodes, ({ one }) => ({
  question: one(questions, {
    fields: [questionStarterCodes.questionId],
    references: [questions.id],
  }),
}));

export const assessmentQuestionsRelations = relations(assessmentQuestions, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentQuestions.assessmentId],
    references: [assessments.id],
  }),
  question: one(questions, {
    fields: [assessmentQuestions.questionId],
    references: [questions.id],
  }),
}));

export const testCasesRelations = relations(testCases, ({ one, many }) => ({
  question: one(questions, {
    fields: [testCases.questionId],
    references: [questions.id],
  }),
  results: many(testCaseResults),
}));

export const assessmentSubmissionsRelations = relations(
  assessmentSubmissions,
  ({ one, many }) => ({
    student: one(users, {
      fields: [assessmentSubmissions.studentId],
      references: [users.id],
    }),
    assessment: one(assessments, {
      fields: [assessmentSubmissions.assessmentId],
      references: [assessments.id],
    }),
    questionSubmissions: many(questionSubmissions),
  })
);

export const questionSubmissionsRelations = relations(questionSubmissions, ({ one, many }) => ({
  assessmentSubmission: one(assessmentSubmissions, {
    fields: [questionSubmissions.assessmentSubmissionId],
    references: [assessmentSubmissions.id],
  }),
  question: one(questions, {
    fields: [questionSubmissions.questionId],
    references: [questions.id],
  }),
  testCaseResults: many(testCaseResults),
}));

export const testCaseResultsRelations = relations(testCaseResults, ({ one }) => ({
  questionSubmission: one(questionSubmissions, {
    fields: [testCaseResults.questionSubmissionId],
    references: [questionSubmissions.id],
  }),
  testCase: one(testCases, {
    fields: [testCaseResults.testCaseId],
    references: [testCases.id],
  }),
}));
