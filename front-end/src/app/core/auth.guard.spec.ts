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

  it('GIVEN un usuario sin sesión, WHEN entra a una página protegida, THEN lo envía al login recordando la página pedida', () => {
    user.set(null);
    expect(run(authGuard, '/submissions/5')).toBe('/login?returnUrl=%2Fsubmissions%2F5');
  });

  it('GIVEN un estudiante con sesión, WHEN entra a sus intentos o al panel del evaluador, THEN solo lo deja pasar a sus intentos', () => {
    user.set(student);

    expect(run(studentGuard)).toBe(true);
    expect(run(adminGuard)).toBe('/assessments');
  });

  it('GIVEN un evaluador con sesión, WHEN intenta resolver un assessment, THEN lo redirige a su panel', () => {
    user.set(admin);

    expect(run(adminGuard)).toBe(true);
    expect(run(studentGuard)).toBe('/admin');
  });

  it('GIVEN un usuario con sesión, WHEN abre el login, THEN lo redirige a su panel', () => {
    user.set(null);
    expect(run(guestGuard, '/login')).toBe(true);

    user.set(admin);
    expect(run(guestGuard, '/login')).toBe('/admin');
  });
});
