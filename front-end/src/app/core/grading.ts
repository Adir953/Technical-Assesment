import type { AssessmentSubmission, QuestionSubmission, SubmissionDetail } from './models';

/** Resumen que el editor envía a la lista de preguntas tras un envío (vía router state). */
export interface SubmittedNotice {
  title: string;
  score: number;
  points: number;
  passed: number;
  total: number;
}

export type QuestionState = 'pending' | 'correct' | 'partial' | 'incorrect';

export const STATE_LABEL: Record<QuestionState, string> = {
  pending: 'Pendiente',
  correct: 'Correcta',
  partial: 'Parcial',
  incorrect: 'Incorrecta',
};

/** Último envío por pregunta (el backend los devuelve del más reciente al más antiguo). */
export function latestByQuestion(detail: SubmissionDetail): Map<number, QuestionSubmission> {
  const latest = new Map<number, QuestionSubmission>();
  for (const attempt of detail.questionSubmissions) {
    if (!latest.has(attempt.questionId)) latest.set(attempt.questionId, attempt);
  }
  return latest;
}

export function questionState(attempt: QuestionSubmission | undefined, points: number): QuestionState {
  if (!attempt) return 'pending';
  const score = attempt.score ?? 0;
  if (score >= points) return 'correct';
  return score > 0 ? 'partial' : 'incorrect';
}

export function accumulatedScore(detail: SubmissionDetail): number {
  let total = 0;
  for (const attempt of latestByQuestion(detail).values()) total += attempt.score ?? 0;
  return total;
}

export function deadline(submission: AssessmentSubmission, durationMinutes: number): number {
  const start = submission.startedAt ? new Date(submission.startedAt).getTime() : Date.now();
  return start + durationMinutes * 60_000;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
