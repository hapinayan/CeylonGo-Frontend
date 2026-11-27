import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminAuthService } from '../services/admin-auth.service';

/**
 * Route guard that ensures the caller has an active, authenticated Admin session.
 * Unauthenticated requests are redirected to /admin/login preserving returnUrl.
 */
export const adminAuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Guard that prevents already-authenticated admins from needlessly visiting /admin/login.
 */
export const adminGuestGuard: CanActivateFn = () => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/admin/dashboard']);
  }

  return true;
};
