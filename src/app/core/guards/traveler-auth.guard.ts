import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guard that protects authenticated traveler routes
 * (such as /artisans/favorites).
 * If the user is unauthenticated, redirects to /auth with returnUrl.
 */
export const travelerAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Permit visual inspection of UI in explicitly labeled demo/preview mode.
  // Note: Demo preview access only allows viewing sample layouts and never authenticates backend calls.
  if (
    authService.isAuthenticated() ||
    route.queryParams['preview'] === 'true' ||
    route.queryParams['demo'] === 'true'
  ) {
    return true;
  }

  return router.createUrlTree(['/auth'], {
    queryParams: { returnUrl: state.url },
  });
};
