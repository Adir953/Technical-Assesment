import { db } from '../db';
import {
  assessmentQuestionRepository,
  assessmentRepository,
  questionRepository,
} from '../repositories';
import { notFound, badRequest } from '../middleware/errorHandler';
import { requireRole } from './userService';
import type { Assessment, CreateAssessmentInput, AssessmentDetail } from '../types/assessment';

export { type Assessment, type CreateAssessmentInput, type AssessmentDetail };

export async function listAssessments(): Promise<Assessment[]> {
  return assessmentRepository.findAll();
}

export async function getAssessment(id: number): Promise<AssessmentDetail> {
  const assessment = await assessmentRepository.findById(id);
  if (!assessment) {
    throw notFound(`Assessment ${id} not found`);
  }

  const questions = await assessmentQuestionRepository.findQuestionsByAssessment(id);
  const totalPossiblePoints = questions.reduce((sum, question) => sum + question.points, 0);

  return { ...assessment, questions, totalPossiblePoints };
}

/**
 * Crea el assessment y lo vincula con sus preguntas. El orden de `questionIds` define el orden
 * de las preguntas y los ids repetidos se ignoran. Falla con 404 si alguna pregunta no existe.
 */
export async function createAssessment(
  input: CreateAssessmentInput
): Promise<AssessmentDetail> {
  const questionIds = [...new Set(input.questionIds)];
  if (questionIds.length === 0) {
    throw badRequest('questionIds must contain at least one question');
  }

  await requireRole(input.createdBy, 'admin');

  const found = await questionRepository.findByIds(questionIds);
  if (found.length !== questionIds.length) {
    const foundIds = new Set(found.map((question) => question.id));
    const missing = questionIds.filter((id) => !foundIds.has(id));
    throw notFound(`Questions not found: ${missing.join(', ')}`);
  }

  const assessment = await db.transaction(async (tx) => {
    const created = await assessmentRepository.create(
      {
        createdBy: input.createdBy,
        title: input.title,
        description: input.description ?? null,
        durationMinutes: input.durationMinutes,
        totalQuestions: questionIds.length,
      },
      tx
    );

    await assessmentQuestionRepository.linkMany(
      questionIds.map((questionId, index) => ({
        assessmentId: created.id,
        questionId,
        questionOrder: index + 1,
      })),
      tx
    );

    return created;
  });

  return getAssessment(assessment.id);
}
