import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import {
  PASSING_PERCENT,
  STATE_LABEL,
  formatDuration,
  isApproved,
  questionRows,
} from '../../core/grading';
import type { AssessmentDetail, SubmissionDetail } from '../../core/models';

@Component({
  selector: 'app-results',
  imports: [RouterLink, DatePipe],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class ResultsPage {
  readonly submissionId = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly labels = STATE_LABEL;
  protected readonly submission = signal<SubmissionDetail | null>(null);
  protected readonly assessment = signal<AssessmentDetail | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly rows = computed(() => {
    const s = this.submission();
    const a = this.assessment();
    return s && a ? questionRows(s, a) : [];
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
  protected readonly passingPercent = PASSING_PERCENT;
  protected readonly approved = computed(() => {
    const s = this.submission();
    return !!s?.completedAt && isApproved(s);
  });
  protected readonly retaking = signal(false);
  // Reintentar exige un segundo clic de confirmación para no perder el reporte por accidente.
  protected readonly confirmingRetake = signal(false);
  protected readonly elapsed = computed(() => {
    const s = this.submission();
    if (!s?.startedAt) return '—';
    const end = s.completedAt ? new Date(s.completedAt).getTime() : Date.now();
    return formatDuration(end - new Date(s.startedAt).getTime());
  });

  constructor() {
    effect(() => this.load(Number(this.submissionId())));
  }

  /** Crea un intento nuevo del mismo assessment (o retoma el que esté en curso). */
  async retake() {
    const s = this.submission();
    if (!s) return;
    this.retaking.set(true);
    this.error.set(null);
    try {
      const submissionId = await this.api.startOrResume(s.assessmentId);
      await this.router.navigate(['/submissions', submissionId]);
    } catch (err) {
      this.error.set(errorMessage(err));
      this.retaking.set(false);
    }
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
