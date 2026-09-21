import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SessionService, UserRole } from '../../core/session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
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
