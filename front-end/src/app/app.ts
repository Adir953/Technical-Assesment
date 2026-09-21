import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SessionService } from './core/session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="topbar">
      <a routerLink="/assessments" class="brand">
        <span class="brand-mark">&lt;/&gt;</span> Technical Assessment
      </a>
      @if (session.user(); as user) {
        <div class="user">
          @if (user.role === 'admin') {
            <a routerLink="/admin" class="nav-link">Panel del evaluador</a>
          }
          <span class="muted">{{ user.name }} · {{ user.role === 'admin' ? 'Evaluador' : 'Estudiante' }}</span>
          <button class="btn btn-ghost" (click)="logout()">Salir</button>
        </div>
      }
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `,
})
export class App {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);

  logout() {
    this.session.logout();
    this.router.navigate(['/login']);
  }
}
