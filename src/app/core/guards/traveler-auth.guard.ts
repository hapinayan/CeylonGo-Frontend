import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guard that protects Authenticated Traveler routes (e.g. /traveler/home).
 * Enforces that:
 * 1. An active traveler session exists (JWT token present).
 * 2. If user profile is loaded, role is 'traveler'.
 * 3. Provider and admin accounts are strictly rejected from traveler-only routes.
 * 4. Unauthenticated users are redirected back to the public homepage (/).
 */
export const travelerAuthGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/']);
  }

  const user = authService.currentUser();
  if (user) {
    if (user.role === 'provider') {
      return router.createUrlTree(['/provider/dashboard']);
    }
    if (user.role !== 'traveler') {
      return router.createUrlTree(['/']);
    }
  }

  return true;
};
