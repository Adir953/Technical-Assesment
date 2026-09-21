import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import type { Assessment } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div>
        <h1>Panel del evaluador</h1>
        <p class="description">Crea assessments y sus preguntas.</p>
      </div>
      <div class="header-actions">
        <a routerLink="questions/new" class="btn">+ Nueva pregunta</a>
        <a routerLink="assessments/new" class="btn btn-primary">+ Nuevo assessment</a>
      </div>
    </header>

    @if (created(); as name) {
      <div class="alert alert-success" role="status">
        <span>Se creó <strong>{{ name }}</strong>.</span>
        <button class="btn btn-ghost btn-sm" (click)="created.set(null)" aria-label="Cerrar">✕</button>
      </div>
    }
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <h2>Assessments ({{ assessments().length }})</h2>
    <table class="results-table">
      <thead><tr><th>Nombre</th><th>Preguntas</th><th>Duración</th></tr></thead>
      <tbody>
        @for (a of assessments(); track a.id) {
          <tr>
            <td><strong>{{ a.title }}</strong>@if (a.description) {<div class="muted clamp">{{ a.description }}</div>}</td>
            <td>{{ a.totalQuestions }}</td>
            <td>{{ a.durationMinutes }} min</td>
          </tr>
        } @empty {
          <tr><td colspan="3" class="muted">{{ loading() ? 'Cargando…' : 'Aún no hay assessments.' }}</td></tr>
        }
      </tbody>
    </table>
  `,
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
