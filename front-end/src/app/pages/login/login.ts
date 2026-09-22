import { Component, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { SessionService, homeFor } from '../../core/session.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginPage {
  /** Página a la que volver tras iniciar sesión (la pone el guard en la query). */
  readonly returnUrl = input<string>();

  private readonly api = inject(ApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);

  async submit(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.error.set(null);
    try {
      const user = await firstValueFrom(this.api.login(this.username().trim(), this.password()));
      this.session.login(user);
      await this.router.navigateByUrl(this.safeReturnUrl() ?? homeFor(user.role));
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && err.status === 401
          ? 'Usuario o contraseña incorrectos.'
          : errorMessage(err)
      );
    } finally {
      this.loading.set(false);
    }
  }

  // Solo rutas internas: evita redirigir a otro sitio con ?returnUrl=//malicioso.com
  private safeReturnUrl(): string | undefined {
    const url = this.returnUrl();
    return url?.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : undefined;
  }
}
