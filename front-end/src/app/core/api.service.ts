import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  Assessment,
  AssessmentDetail,
  AssessmentSubmission,
  CreateAssessmentInput,
  CreateQuestionInput,
  Question,
  ExecutionResult,
  ProgrammingLanguage,
  QuestionDetail,
  SolutionResult,
  SubmissionDetail,
} from './models';
import type { SessionUser } from './session.service';

// Rutas relativas: en desarrollo las resuelve el proxy de `ng serve`,
// y en el contenedor las reenvía nginx al servicio `backend-api`.
const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /** Si las credenciales son válidas, el backend deja el JWT en una cookie httpOnly. */
  login(username: string, password: string) {
    return this.http.post<SessionUser>(`${API}/auth/login`, { username, password });
  }

  me() {
    return this.http.get<SessionUser>(`${API}/auth/me`);
  }

  logout() {
    return this.http.post<void>(`${API}/auth/logout`, {});
  }

  listAssessments() {
    return this.http.get<Assessment[]>(`${API}/assessments`);
  }

  getAssessment(id: number) {
    return this.http.get<AssessmentDetail>(`${API}/assessments/${id}`);
  }

  createAssessment(input: CreateAssessmentInput) {
    return this.http.post<AssessmentDetail>(`${API}/assessments`, input);
  }

  listQuestions() {
    return this.http.get<Question[]>(`${API}/questions`);
  }

  createQuestion(input: CreateQuestionInput) {
    return this.http.post<QuestionDetail>(`${API}/questions`, input);
  }

  getQuestion(id: number) {
    return this.http.get<QuestionDetail>(`${API}/questions/${id}`);
  }

  runQuestion(id: number, code: string, language: ProgrammingLanguage) {
    return this.http.post<ExecutionResult>(`${API}/questions/${id}/run`, { code, language });
  }

  /** Intentos del estudiante de la sesión, del más reciente al más antiguo. */
  listSubmissions() {
    return this.http.get<AssessmentSubmission[]>(`${API}/submissions`);
  }

  startAssessment(assessmentId: number) {
    return this.http.post<AssessmentSubmission>(`${API}/submissions`, { assessmentId });
  }

  /** Crea un intento nuevo; si ya hay uno en curso (409), devuelve el id de ese intento. */
  async startOrResume(assessmentId: number): Promise<number> {
    try {
      return (await firstValueFrom(this.startAssessment(assessmentId))).id;
    } catch (err) {
      // 409: "Student X already has attempt N in progress for this assessment"
      const match =
        err instanceof HttpErrorResponse && err.status === 409
          ? /attempt (\d+)/.exec(err.error?.error?.message ?? '')
          : null;
      if (match) return Number(match[1]);
      throw err;
    }
  }

  getSubmission(id: number) {
    return this.http.get<SubmissionDetail>(`${API}/submissions/${id}`);
  }

  submitSolution(submissionId: number, questionId: number, code: string, language: ProgrammingLanguage) {
    return this.http.post<SolutionResult>(`${API}/submissions/${submissionId}/questions`, {
      questionId,
      code,
      language,
    });
  }

  completeAssessment(submissionId: number) {
    return this.http.post<AssessmentSubmission>(`${API}/submissions/${submissionId}/complete`, {});
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con el backend.';
    return error.error?.error?.message ?? error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
