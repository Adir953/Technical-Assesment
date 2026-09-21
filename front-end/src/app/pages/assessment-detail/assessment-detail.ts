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
  questionRows,
} from '../../core/grading';
import type { AssessmentDetail, SubmissionDetail } from '../../core/models';

@Component({
  selector: 'app-assessment-detail',
  imports: [RouterLink],
  templateUrl: './assessment-detail.html',
  styleUrl: './assessment-detail.css',
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
    return s && a ? questionRows(s, a) : [];
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
