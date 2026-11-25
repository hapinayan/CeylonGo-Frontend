import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ProviderAuthService } from '../services/provider-auth.service';

/**
 * Functional Route Guard that protects Service Provider routes (e.g. /provider/dashboard).
 * Enforces that:
 * 1. An active provider JWT session exists.
 * 2. User has role 'provider', approval_status 'approved', and is_active is true.
 *
 * Unauthenticated callers are redirected to /provider/login.
 */
export const providerAuthGuard: CanActivateFn = (_route, _state) => {
  const providerAuthService = inject(ProviderAuthService);
  const router = inject(Router);

  if (providerAuthService.isAuthenticated() && providerAuthService.isApprovedProvider()) {
    return true;
  }

  return router.createUrlTree(['/provider/login']);
};
