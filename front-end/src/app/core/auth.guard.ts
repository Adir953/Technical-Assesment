import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService, UserRole, homeFor } from './session.service';

function guard(role?: UserRole): CanActivateFn {
  return (_route, state) => {
    const user = inject(SessionService).user();
    const router = inject(Router);
    // returnUrl: tras iniciar sesión se vuelve a la página que se quería abrir.
    if (!user) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    if (role && user.role !== role) return router.createUrlTree([homeFor(user.role)]);
    return true;
  };
}

export const authGuard = guard();

/** El panel de creación es exclusivo del evaluador (rol admin). */
export const adminGuard = guard('admin');

/** Resolver assessments es exclusivo de estudiantes (el backend rechaza otros roles). */
export const studentGuard = guard('student');

/** El login solo tiene sentido sin sesión: con sesión se va directo a la página del rol. */
export const guestGuard: CanActivateFn = () => {
  const user = inject(SessionService).user();
  return user ? inject(Router).createUrlTree([homeFor(user.role)]) : true;
};
