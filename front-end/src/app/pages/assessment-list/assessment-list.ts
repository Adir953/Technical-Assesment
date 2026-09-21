import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SessionService } from '../../core/session.service';
import { isApproved, scorePercent } from '../../core/grading';
import type { Assessment, AssessmentSubmission } from '../../core/models';

interface AssessmentStatus {
  inProgress?: AssessmentSubmission;
  lastCompleted?: AssessmentSubmission;
}

@Component({
  selector: 'app-assessment-list',
  imports: [RouterLink, DatePipe],
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
        @let status = statusById().get(assessment.id) ?? {};
        <article class="card assessment-card">
          <div class="card-title-row">
            <h2>{{ assessment.title }}</h2>
            @if (isStudent()) {
              @if (status.inProgress) {
                <span class="badge badge-progress">En progreso</span>
              } @else if (status.lastCompleted; as last) {
                <span class="badge" [class]="approved(last) ? 'badge badge-correct' : 'badge badge-incorrect'">
                  {{ approved(last) ? 'Aprobado' : 'No aprobado' }}
                </span>
              }
            }
          </div>
          <p class="description">{{ assessment.description }}</p>
          <dl class="meta">
            <div><dt>Duración</dt><dd>{{ assessment.durationMinutes }} min</dd></div>
            <div><dt>Preguntas</dt><dd>{{ assessment.totalQuestions }}</dd></div>
          </dl>

          @if (isStudent()) {
            @if (!status.inProgress && status.lastCompleted; as last) {
              <p class="last-result">
                Último resultado: <strong>{{ last.finalScore ?? 0 }}/{{ last.totalPossiblePoints }} pts ({{ percent(last) }}%)</strong>
                <span class="muted">· {{ last.completedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
              </p>
            }
            <div class="card-actions">
              @if (status.inProgress; as current) {
                <a class="btn btn-primary" [routerLink]="['/submissions', current.id]">Continuar</a>
              } @else if (status.lastCompleted; as last) {
                <!-- Reintentar solo se ofrece desde el reporte, con confirmación. -->
                <a class="btn btn-primary" [routerLink]="['/submissions', last.id, 'results']">Ver resultado</a>
              } @else {
                <button class="btn btn-primary" [disabled]="starting() === assessment.id" (click)="start(assessment)">
                  {{ starting() === assessment.id ? 'Abriendo…' : 'Iniciar' }}
                </button>
              }
            </div>
          }
        </article>
      }
    </div>
  `,
})
export class AssessmentListPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

  protected readonly assessments = signal<Assessment[]>([]);
  private readonly submissions = signal<AssessmentSubmission[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly starting = signal<number | null>(null);
  protected readonly isStudent = computed(() => this.session.user()?.role === 'student');

  /** Intento en curso y último intento terminado de cada assessment. */
  protected readonly statusById = computed(() => {
    const map = new Map<number, AssessmentStatus>();
    // Los intentos vienen del más reciente al más antiguo: el primero encontrado es el último.
    for (const s of this.submissions()) {
      const status = map.get(s.assessmentId) ?? {};
      if (!s.completedAt) status.inProgress ??= s;
      else status.lastCompleted ??= s;
      map.set(s.assessmentId, status);
    }
    return map;
  });

  protected readonly approved = isApproved;
  protected readonly percent = scorePercent;

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const user = this.session.user();
      const [assessments, submissions] = await Promise.all([
        firstValueFrom(this.api.listAssessments()),
        user?.role === 'student' ? firstValueFrom(this.api.listSubmissions(user.id)) : Promise.resolve([]),
      ]);
      this.assessments.set(assessments);
      this.submissions.set(submissions);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async start(assessment: Assessment) {
    const user = this.session.user();
    if (!user) return;
    this.starting.set(assessment.id);
    this.error.set(null);
    try {
      const submissionId = await this.api.startOrResume(user.id, assessment.id);
      await this.router.navigate(['/submissions', submissionId]);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.starting.set(null);
    }
  }
}
