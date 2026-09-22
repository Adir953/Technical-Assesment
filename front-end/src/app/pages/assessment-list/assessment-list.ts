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
  templateUrl: './assessment-list.html',
  styleUrl: './assessment-list.css',
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
        user?.role === 'student' ? firstValueFrom(this.api.listSubmissions()) : Promise.resolve([]),
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
    this.starting.set(assessment.id);
    this.error.set(null);
    try {
      const submissionId = await this.api.startOrResume(assessment.id);
      await this.router.navigate(['/submissions', submissionId]);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.starting.set(null);
    }
  }
}
