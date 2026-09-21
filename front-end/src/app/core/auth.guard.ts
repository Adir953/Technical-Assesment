import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService, UserRole } from './session.service';

function guard(role?: UserRole): CanActivateFn {
  return () => {
    const user = inject(SessionService).user();
    const router = inject(Router);
    if (!user) return router.createUrlTree(['/login']);
    if (role && user.role !== role) {
      return router.createUrlTree([user.role === 'admin' ? '/admin' : '/assessments']);
    }
    return true;
  };
}

export const authGuard = guard();

/** El panel de creación es exclusivo del evaluador (rol admin). */
export const adminGuard = guard('admin');

/** Resolver assessments es exclusivo de estudiantes (el backend rechaza otros roles). */
export const studentGuard = guard('student');
