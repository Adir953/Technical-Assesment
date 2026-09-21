import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { STATE_LABEL, formatDuration, latestByQuestion, questionState } from '../../core/grading';
import type { AssessmentDetail, SubmissionDetail } from '../../core/models';

@Component({
  selector: 'app-results',
  imports: [RouterLink],
  template: `
    <a routerLink="/assessments" class="back">← Assessments</a>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (assessment(); as a) {
      <h1>Resultados · {{ a.title }}</h1>
      @if (!submission()?.completedAt) {
        <div class="alert">Este intento aún está en progreso; el puntaje mostrado es parcial.</div>
      }

      <section class="stats">
        <div class="stat">
          <span class="stat-label">Puntaje obtenido</span>
          <span class="stat-value">{{ score() }} / {{ total() }}</span>
          <span class="muted">{{ percent() }}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">Preguntas correctas</span>
          <span class="stat-value ok">{{ count('correct') }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Preguntas incorrectas</span>
          <span class="stat-value fail">{{ count('incorrect') + count('pending') }}</span>
          @if (count('partial')) { <span class="muted">+ {{ count('partial') }} parciales</span> }
        </div>
        <div class="stat">
          <span class="stat-label">Tiempo consumido</span>
          <span class="stat-value">{{ elapsed() }}</span>
          <span class="muted">de {{ a.durationMinutes }} min</span>
        </div>
      </section>

      <div class="progress"><div class="progress-bar" [style.width.%]="percent()"></div></div>

      <h2>Detalle por pregunta</h2>
      <table class="results-table">
        <thead>
          <tr><th>#</th><th>Pregunta</th><th>Lenguaje</th><th>Casos</th><th>Puntaje</th><th>Estado</th></tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.question.id) {
            <tr>
              <td>{{ row.question.questionOrder }}</td>
              <td>{{ row.question.title }}</td>
              <td>{{ row.attempt?.programmingLanguage ?? '—' }}</td>
              <td>{{ row.attempt ? row.attempt.passedTests + ' / ' + row.attempt.totalTests : '—' }}</td>
              <td>{{ row.attempt?.score ?? 0 }} / {{ row.question.points }}</td>
              <td><span class="badge badge-{{ row.state }}">{{ labels[row.state] }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    } @else if (!error()) {
      <p class="muted">Cargando resultados…</p>
    }
  `,
})
export class ResultsPage {
  readonly submissionId = input.required<string>();

  private readonly api = inject(ApiService);
  protected readonly labels = STATE_LABEL;
  protected readonly submission = signal<SubmissionDetail | null>(null);
  protected readonly assessment = signal<AssessmentDetail | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const s = this.submission();
    const a = this.assessment();
    if (!s || !a) return [];
    const latest = latestByQuestion(s);
    return [...a.questions]
      .sort((x, y) => x.questionOrder - y.questionOrder)
      .map((question) => {
        const attempt = latest.get(question.id);
        return { question, attempt, state: questionState(attempt, question.points) };
      });
  });
  protected readonly score = computed(() => {
    const s = this.submission();
    if (s?.completedAt) return s.finalScore ?? 0;
    return this.rows().reduce((sum, r) => sum + (r.attempt?.score ?? 0), 0);
  });
  protected readonly total = computed(
    () => this.submission()?.totalPossiblePoints || this.assessment()?.totalPossiblePoints || 0
  );
  protected readonly percent = computed(() =>
    this.total() ? Math.round((this.score() / this.total()) * 100) : 0
  );
  protected readonly elapsed = computed(() => {
    const s = this.submission();
    if (!s?.startedAt) return '—';
    const end = s.completedAt ? new Date(s.completedAt).getTime() : Date.now();
    return formatDuration(end - new Date(s.startedAt).getTime());
  });

  constructor() {
    effect(() => this.load(Number(this.submissionId())));
  }

  protected count(state: string) {
    return this.rows().filter((r) => r.state === state).length;
  }

  private async load(id: number) {
    try {
      const submission = await firstValueFrom(this.api.getSubmission(id));
      const assessment = await firstValueFrom(this.api.getAssessment(submission.assessmentId));
      this.submission.set(submission);
      this.assessment.set(assessment);
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }
}
