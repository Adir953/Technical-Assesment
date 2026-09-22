import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { adminGuard, authGuard, guestGuard, studentGuard } from './auth.guard';
import { SessionService, SessionUser } from './session.service';

describe('guards de autenticación', () => {
  const user = signal<SessionUser | null>(null);
  const student: SessionUser = { id: 8, name: 'Estudiante Demo', username: 'estudiante', email: 'e@example.com', role: 'student' };
  const admin: SessionUser = { id: 7, name: 'Administrador', username: 'admin', email: 'a@example.com', role: 'admin' };

  function run(guard: CanActivateFn, url = '/assessments'): true | string {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)
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

  it('envía al login recordando la página pedida si no hay sesión', () => {
    user.set(null);
    expect(run(authGuard, '/submissions/5')).toBe('/login?returnUrl=%2Fsubmissions%2F5');
  });

  it('deja pasar al estudiante a sus intentos pero no al panel del evaluador', () => {
    user.set(student);

    expect(run(studentGuard)).toBe(true);
    expect(run(adminGuard)).toBe('/assessments');
  });

  it('redirige al evaluador a su panel si intenta resolver un assessment', () => {
    user.set(admin);

    expect(run(adminGuard)).toBe(true);
    expect(run(studentGuard)).toBe('/admin');
  });

  it('saca del login a quien ya tiene sesión', () => {
    user.set(null);
    expect(run(guestGuard, '/login')).toBe(true);

    user.set(admin);
    expect(run(guestGuard, '/login')).toBe('/admin');
  });
});
