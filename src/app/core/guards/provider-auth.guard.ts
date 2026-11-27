import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ProviderPreviewService } from '../../provider/provider-preview.service';
import { ProviderAuthService } from '../services/provider-auth.service';

/**
 * Functional Route Guard that protects Service Provider routes (e.g. /provider/dashboard).
 * Enforces that:
 * 1. An active provider JWT session exists and is approved & active.
 * 2. In local development builds only (`providerPreviewEnabled === true`),
 *    allows preview mode when `?preview=true` is active without creating any fake token.
 *
 * In production builds, preview access is compile-time disabled and unauthenticated callers
 * are always redirected to /provider/login.
 */
export const providerAuthGuard: CanActivateFn = (route, state) => {
  const providerAuthService = inject(ProviderAuthService);
  const providerPreview = inject(ProviderPreviewService);
  const router = inject(Router);

  if (providerAuthService.isAuthenticated() && providerAuthService.isApprovedProvider()) {
    providerPreview.disable();
    return true;
  }

  const previewParam = route?.queryParamMap?.get('preview') ?? undefined;
  const stateUrl = state?.url;
  if (
    providerPreview.canUsePreview() &&
    providerPreview.syncFromNavigation(stateUrl, previewParam)
  ) {
    return true;
  }

  return router.createUrlTree(['/provider/login']);
};
