import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ProviderAuthService } from '../services/provider-auth.service';

/**
 * Functional HTTP Interceptor that attaches the appropriate JWT Bearer token
 * to authenticated backend requests targeting CeylonGo APIs (/api/v1/).
 *
 * Correctly isolates traveler authentication from provider authentication:
 * - Provider endpoints (/api/v1/providers/) use provider access tokens.
 * - Traveler endpoints use traveler access tokens.
 * - Requests with explicitly provided Authorization headers (such as onboarding single-use tokens) are preserved.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Requests with their own explicit credentials manage their own session.
  if (req.headers.has('Authorization')) return next(req);

  const authService = inject(AuthService);
  const providerAuthService = inject(ProviderAuthService);

  const isProviderApi = req.url.includes('/api/v1/providers');
  const token = isProviderApi ? providerAuthService.getToken() : authService.getToken();

  let outgoingReq = req;

  // Attach token if available and request is targeting the CeylonGo API
  if (token && req.url.includes('/api/v1/')) {
    outgoingReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(outgoingReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 on an authenticated endpoint, purge the corresponding session
      if (error.status === 401) {
        if (
          isProviderApi &&
          !req.url.includes('/providers/login') &&
          !req.url.includes('/providers/password/setup')
        ) {
          providerAuthService.logout();
        } else if (
          !isProviderApi &&
          !req.url.includes('/auth/login') &&
          !req.url.includes('/auth/google')
        ) {
          authService.logout();
        }
      }
      return throwError(() => error);
    })
  );
};
