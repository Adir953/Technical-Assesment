import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { adminGuard, authGuard, studentGuard } from './auth.guard';
import { SessionService, SessionUser } from './session.service';

describe('guards de autenticación', () => {
  const user = signal<SessionUser | null>(null);

  function run(guard: typeof authGuard): true | string {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    return result === true ? true : TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SessionService, useValue: { user } },
      ],
    });
  });

  it('envía al login si no hay sesión', () => {
    user.set(null);
    expect(run(authGuard)).toBe('/login');
  });

  it('deja pasar al estudiante a sus intentos pero no al panel del evaluador', () => {
    user.set({ id: 8, name: 'Estudiante Demo', username: 'estudiante', email: 'e@example.com', role: 'student' });

    expect(run(studentGuard)).toBe(true);
    expect(run(adminGuard)).toBe('/assessments');
  });

  it('redirige al evaluador a su panel si intenta resolver un assessment', () => {
    user.set({ id: 7, name: 'Administrador', username: 'admin', email: 'a@example.com', role: 'admin' });

    expect(run(adminGuard)).toBe(true);
    expect(run(studentGuard)).toBe('/admin');
  });
});
