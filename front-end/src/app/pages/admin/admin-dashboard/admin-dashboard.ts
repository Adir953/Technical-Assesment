import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../../core/api.service';
import type { Assessment } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboardPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly assessments = signal<Assessment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  // Nombre de lo recién creado, recibido desde los formularios al redirigir.
  protected readonly created = signal<string | null>(
    (this.router.currentNavigation()?.extras.state?.['created'] as string | undefined) ?? null
  );

  constructor() {
    this.api.listAssessments().subscribe({
      next: (assessments) => {
        this.assessments.set(assessments);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
