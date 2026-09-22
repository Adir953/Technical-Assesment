import {
  formatDuration,
  isApproved,
  latestByQuestion,
  questionRows,
  questionState,
  scorePercent,
} from './grading';
import type { AssessmentDetail, AssessmentSubmission, QuestionSubmission, SubmissionDetail } from './models';

function attempt(id: number, questionId: number, score: number): QuestionSubmission {
  return {
    id,
    assessmentSubmissionId: 1,
    questionId,
    studentCode: '',
    programmingLanguage: 'javascript',
    score,
    passedTests: 0,
    totalTests: 5,
    compilationError: null,
    executionOutput: null,
    submittedAt: null,
  };
}

function submission(finalScore: number | null, total: number): AssessmentSubmission {
  return {
    id: 1,
    studentId: 8,
    assessmentId: 1,
    finalScore,
    totalPossiblePoints: total,
    startedAt: null,
    completedAt: null,
  };
}

describe('grading', () => {
  describe('questionState', () => {
    it('GIVEN una pregunta sin envíos, WHEN se calcula su estado, THEN queda como pendiente', () => {
      expect(questionState(undefined, 10)).toBe('pending');
    });

    it('GIVEN distintos puntajes, WHEN se calcula el estado, THEN distingue correcta, parcial e incorrecta', () => {
      expect(questionState({ score: 10 }, 10)).toBe('correct');
      expect(questionState({ score: 4 }, 10)).toBe('partial');
      expect(questionState({ score: 0 }, 10)).toBe('incorrect');
    });
  });

  it('GIVEN varios envíos de una misma pregunta, WHEN se llama a latestByQuestion, THEN se queda con el más reciente de cada pregunta', () => {
    // El backend devuelve los envíos del más reciente al más antiguo.
    const detail = {
      ...submission(null, 20),
      questionSubmissions: [attempt(3, 1, 10), attempt(2, 2, 5), attempt(1, 1, 0)],
    } as SubmissionDetail;

    const latest = latestByQuestion(detail);

    expect(latest.get(1)?.id).toBe(3);
    expect(latest.get(2)?.id).toBe(2);
  });

  it('GIVEN preguntas desordenadas, WHEN se llama a questionRows, THEN las ordena y les asigna su estado', () => {
    const detail = { ...submission(null, 20), questionSubmissions: [attempt(1, 2, 10)] } as SubmissionDetail;
    const assessment = {
      questions: [
        { id: 2, title: 'Invertir cadena', points: 10, questionOrder: 2 },
        { id: 1, title: 'Máximo', points: 10, questionOrder: 1 },
      ],
    } as AssessmentDetail;

    const rows = questionRows(detail, assessment);

    expect(rows.map((r) => r.question.id)).toEqual([1, 2]);
    expect(rows.map((r) => r.state)).toEqual(['pending', 'correct']);
  });

  describe('aprobación', () => {
    it('GIVEN un puntaje final, WHEN se evalúa la aprobación, THEN aprueba desde el 60 % del puntaje total', () => {
      expect(scorePercent(submission(16, 25))).toBe(64);
      expect(isApproved(submission(16, 25))).toBe(true);
      expect(isApproved(submission(14, 25))).toBe(false);
    });

    it('GIVEN un assessment sin puntaje total, WHEN se calcula el porcentaje, THEN devuelve 0 sin fallar', () => {
      expect(scorePercent(submission(null, 0))).toBe(0);
    });
  });

  it('GIVEN distintas duraciones, WHEN se llama a formatDuration, THEN muestra horas solo cuando hacen falta', () => {
    expect(formatDuration(65_000)).toBe('01:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-5_000)).toBe('00:00');
  });
});
