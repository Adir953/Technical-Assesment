import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import {
  STATE_LABEL,
  SubmittedNotice,
  accumulatedScore,
  deadline,
  formatDuration,
  latestByQuestion,
  questionState,
} from '../../core/grading';
import type { AssessmentDetail, SubmissionDetail } from '../../core/models';

@Component({
  selector: 'app-assessment-detail',
  imports: [RouterLink],
  template: `
    <a routerLink="/assessments" class="back">← Assessments</a>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (notice(); as n) {
      <div class="alert alert-success" role="status">
        <span>
          Respuesta enviada: <strong>{{ n.title }}</strong> —
          {{ n.passed }}/{{ n.total }} casos, {{ n.score }}/{{ n.points }} pts.
        </span>
        <button class="btn btn-ghost btn-sm" (click)="notice.set(null)" aria-label="Cerrar">✕</button>
      </div>
    }
    @if (assessment(); as a) {
      <header class="page-header">
        <div>
          <h1>{{ a.title }}</h1>
          <p class="description">{{ a.description }}</p>
        </div>
      </header>

      <section class="stats">
        <div class="stat">
          <span class="stat-label">Tiempo restante</span>
          <span class="stat-value" [class.danger]="remainingMs() < 5 * 60_000 && !completed()">
            {{ completed() ? '—' : remaining() }}
          </span>
        </div>
        <div class="stat">
          <span class="stat-label">Estado</span>
          <span class="stat-value">
            <span class="badge" [class]="completed() ? 'badge-done' : 'badge-progress'">
              {{ completed() ? 'Finalizado' : 'En progreso' }}
            </span>
          </span>
        </div>
        <div class="stat">
          <span class="stat-label">Puntaje acumulado</span>
          <span class="stat-value">{{ score() }} / {{ a.totalPossiblePoints }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Respondidas</span>
          <span class="stat-value">{{ answered() }} / {{ a.questions.length }}</span>
        </div>
      </section>

      <h2>Preguntas</h2>
      <ol class="question-list">
        @for (row of rows(); track row.question.id) {
          <li class="card question-row">
            <div class="question-info">
              <span class="order">{{ row.question.questionOrder }}</span>
              <div>
                <strong>{{ row.question.title }}</strong>
                <span class="muted">{{ row.question.points }} pts
                  @if (row.attempt) { · obtenido {{ row.attempt.score ?? 0 }} pts ({{ row.attempt.passedTests }}/{{ row.attempt.totalTests }} casos) }
                </span>
              </div>
            </div>
            <div class="question-actions">
              <span class="badge badge-{{ row.state }}">{{ labels[row.state] }}</span>
              @if (!completed()) {
                <a class="btn" [routerLink]="['questions', row.question.id]">
                  {{ row.attempt ? 'Reintentar' : 'Resolver' }}
                </a>
              }
            </div>
          </li>
        }
      </ol>

      <div class="actions-end">
        @if (completed()) {
          <a class="btn btn-primary" routerLink="results">Ver resultados</a>
        } @else {
          @if (!allAnswered()) {
            <span class="muted finish-hint">
              Responde todas las preguntas para finalizar ({{ pendingCount() }} pendiente{{ pendingCount() === 1 ? '' : 's' }}).
            </span>
          }
          <button class="btn btn-primary" [disabled]="finishing() || !allAnswered()" (click)="finish()">
            {{ finishing() ? 'Finalizando…' : 'Finalizar assessment' }}
          </button>
        }
      </div>
    } @else if (!error()) {
      <p class="muted">Cargando…</p>
    }
  `,
})
export class AssessmentDetailPage {
  readonly submissionId = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly labels = STATE_LABEL;
  protected readonly submission = signal<SubmissionDetail | null>(null);
  protected readonly assessment = signal<AssessmentDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly finishing = signal(false);
  private readonly now = signal(Date.now());
  private autoFinished = false;

  protected readonly completed = computed(() => !!this.submission()?.completedAt);
  protected readonly score = computed(() => {
    const s = this.submission();
    return s ? (s.completedAt ? s.finalScore ?? 0 : accumulatedScore(s)) : 0;
  });
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
  protected readonly answered = computed(() => this.rows().filter((r) => r.attempt).length);
  protected readonly pendingCount = computed(() => this.rows().length - this.answered());
  protected readonly allAnswered = computed(() => this.rows().length > 0 && this.pendingCount() === 0);
  // Resumen del último envío, recibido desde el editor al redirigir.
  protected readonly notice = signal<SubmittedNotice | null>(
    (this.router.currentNavigation()?.extras.state?.['submitted'] as SubmittedNotice | undefined) ?? null
  );
  protected readonly remainingMs = computed(() => {
    const s = this.submission();
    const a = this.assessment();
    return s && a ? deadline(s, a.durationMinutes) - this.now() : 0;
  });
  protected readonly remaining = computed(() => formatDuration(this.remainingMs()));

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    effect(() => {
      const id = Number(this.submissionId());
      this.load(id);
    });

    // Al agotarse el tiempo se cierra el intento automáticamente.
    effect(() => {
      if (this.assessment() && !this.completed() && this.remainingMs() <= 0 && !this.autoFinished) {
        this.autoFinished = true;
        this.finish();
      }
    });
  }

  private async load(id: number) {
    try {
      const submission = await firstValueFrom(this.api.getSubmission(id));
      // Un intento terminado siempre se consulta en su reporte.
      if (submission.completedAt) {
        await this.router.navigate(['/submissions', id, 'results'], { replaceUrl: true });
        return;
      }
      const assessment = await firstValueFrom(this.api.getAssessment(submission.assessmentId));
      this.submission.set(submission);
      this.assessment.set(assessment);
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }

  async finish() {
    const s = this.submission();
    if (!s) return;
    this.finishing.set(true);
    try {
      await firstValueFrom(this.api.completeAssessment(s.id));
      await this.router.navigate(['/submissions', s.id, 'results']);
    } catch (err) {
      this.error.set(errorMessage(err));
      this.finishing.set(false);
    }
  }
}
