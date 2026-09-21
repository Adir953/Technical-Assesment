import { Injectable, signal } from '@angular/core';

export type UserRole = 'student' | 'admin';

/** Usuario autenticado por `POST /api/auth/login` (tabla users). */
export interface SessionUser {
  id: number;
  name: string;
  username: string | null;
  email: string;
  role: UserRole;
}

const USER_KEY = 'tap.user';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  // Las sesiones guardadas por los logins simulados anteriores no traen `username`: se descartan.
  readonly user = signal<SessionUser | null>(
    ((u) => (u?.role && 'username' in u ? u : null))(read<SessionUser | null>(USER_KEY, null))
  );

  login(user: SessionUser) {
    this.user.set(user);
    write(USER_KEY, user);
  }

  logout() {
    this.user.set(null);
    write(USER_KEY, null);
  }
}
