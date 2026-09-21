import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import type { Assessment } from '../../core/models';

@Component({
  selector: 'app-assessment-list',
  imports: [RouterLink],
  template: `
    <h1>Assessments disponibles</h1>
    @if (!isStudent()) {
      <div class="alert">Vista de candidato en modo lectura. Para crear assessments y preguntas ve al <a routerLink="/admin">panel del evaluador</a>.</div>
    }
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (loading()) {
      <p class="muted">Cargando assessments…</p>
    } @else if (assessments().length === 0 && !error()) {
      <p class="muted">No hay assessments registrados.</p>
    }
    <div class="grid">
      @for (assessment of assessments(); track assessment.id) {
        <article class="card assessment-card">
          <h2>{{ assessment.title }}</h2>
          <p class="description">{{ assessment.description }}</p>
          <dl class="meta">
            <div><dt>Duración</dt><dd>{{ assessment.durationMinutes }} min</dd></div>
            <div><dt>Preguntas</dt><dd>{{ assessment.totalQuestions }}</dd></div>
          </dl>
          @if (isStudent()) {
            <button class="btn btn-primary" [disabled]="starting() === assessment.id" (click)="open(assessment)">
              {{ starting() === assessment.id ? 'Abriendo…' : session.getAttempt(assessment.id) ? 'Continuar' : 'Iniciar' }}
            </button>
          }
        </article>
      }
    </div>
  `,
})
export class AssessmentListPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  protected readonly assessments = signal<Assessment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly starting = signal<number | null>(null);
  protected readonly isStudent = computed(() => this.session.user()?.role === 'student');

  constructor() {
    this.api.listAssessments().subscribe({
      next: (list) => {
        this.assessments.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  async open(assessment: Assessment) {
    const user = this.session.user();
    if (!user) return;
    this.starting.set(assessment.id);
    this.error.set(null);

    try {
      const submissionId = await this.resolveAttempt(user.id, assessment.id);
      this.session.saveAttempt(assessment.id, submissionId);
      await this.router.navigate(['/submissions', submissionId]);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.starting.set(null);
    }
  }

  /** Reutiliza el intento en curso si existe; si no, crea uno nuevo. */
  private async resolveAttempt(studentId: number, assessmentId: number): Promise<number> {
    const known = this.session.getAttempt(assessmentId);
    if (known) {
      try {
        const detail = await firstValueFrom(this.api.getSubmission(known));
        if (!detail.completedAt) return known;
      } catch {
        /* intento desconocido para el backend: se crea otro */
      }
    }

    try {
      const created = await firstValueFrom(this.api.startAssessment(studentId, assessmentId));
      return created.id;
    } catch (err) {
      // 409: "Student X already has attempt N in progress for this assessment"
      const match = err instanceof HttpErrorResponse && err.status === 409
        ? /attempt (\d+)/.exec(err.error?.error?.message ?? '')
        : null;
      if (match) return Number(match[1]);
      throw err;
    }
  }
}
