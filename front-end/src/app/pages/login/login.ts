import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SessionService, UserRole } from '../../core/session.service';

@Component({
  selector: 'app-login',
  template: `
    <section class="card narrow">
      <h1>Iniciar sesión</h1>
      <p class="muted">Ingresa con tu usuario y elige tu perfil.</p>

      <form class="login-form" (submit)="submit($event)">
        <fieldset class="role-toggle">
          <legend>Perfil</legend>
          <label [class.active]="role() === 'student'">
            <input type="radio" name="role" value="student" [checked]="role() === 'student'" (change)="role.set('student')" />
            Estudiante
          </label>
          <label [class.active]="role() === 'admin'">
            <input type="radio" name="role" value="admin" [checked]="role() === 'admin'" (change)="role.set('admin')" />
            Evaluador
          </label>
        </fieldset>

        <label class="field">
          Usuario
          <input name="username" autocomplete="username" required
                 [value]="username()" (input)="username.set($any($event.target).value)" />
        </label>
        <label class="field">
          Contraseña
          <input name="password" type="password" autocomplete="current-password" required
                 [value]="password()" (input)="password.set($any($event.target).value)" />
        </label>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
          {{ loading() ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>

      <p class="muted hint">Cuentas de prueba: <code>estudiante / estudiante</code> · <code>admin / admin</code></p>
    </section>
  `,
})
export class LoginPage {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  protected readonly loading = signal(false);
  private readonly router = inject(Router);

  protected readonly role = signal<UserRole>('student');
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);

  async submit(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.error.set(null);
    try {
      const user = await firstValueFrom(this.api.login(this.username(), this.password(), this.role()));
      this.session.login(user);
      await this.router.navigate([user.role === 'admin' ? '/admin' : '/assessments']);
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && err.status === 401
          ? 'Usuario, contraseña o perfil incorrectos.'
          : errorMessage(err)
      );
    } finally {
      this.loading.set(false);
    }
  }
}
