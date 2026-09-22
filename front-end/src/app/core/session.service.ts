import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export type UserRole = 'student' | 'admin';

/** Usuario autenticado por `POST /api/auth/login` (tabla users). */
export interface SessionUser {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: UserRole;
}

/** Página de inicio de cada rol. */
export function homeFor(role: UserRole): string {
  return role === 'admin' ? '/admin' : '/assessments';
}

/**
 * La sesión real es un JWT en una cookie httpOnly que el front no puede leer. Aquí solo se guarda
 * el usuario que el backend devuelve, para pintar la interfaz y decidir la navegación.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);

  readonly user = signal<SessionUser | null>(null);

  /** Se llama al arrancar la app: si la cookie sigue vigente, el backend devuelve su usuario. */
  async restore() {
    try {
      this.user.set(await firstValueFrom(this.api.me()));
    } catch {
      this.user.set(null);
    }
  }

  login(user: SessionUser) {
    this.user.set(user);
  }

  async logout() {
    try {
      await firstValueFrom(this.api.logout());
    } finally {
      this.clear();
    }
  }

  /** Olvida al usuario sin llamar al backend (p. ej. cuando la cookie ya venció). */
  clear() {
    this.user.set(null);
  }
}
