import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Protects authenticated traveler routes.
 * Preserves role-based access restrictions.
 * Redirects unauthenticated users to authentication.
 */
export const travelerAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth'], {
      queryParams: { returnUrl: state.url },
    });
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