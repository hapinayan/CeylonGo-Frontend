import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AdminAuthService } from '../services/admin-auth.service';

/**
 * Route guard restricting access strictly to Super Admin accounts.
 *
 * Denies access to ordinary admins with an alert redirect to /admin/dashboard.
 */
export const superAdminGuard: CanActivateFn = () => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/admin/login']);
  }

  if (authService.isSuperAdmin()) {
    return true;
  }

  // Ordinary admin attempted to access super-admin-only module
  return router.createUrlTree(['/admin/dashboard'], {
    queryParams: { accessDenied: 'super-admin-required' },
  });
};
