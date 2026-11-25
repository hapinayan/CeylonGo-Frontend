import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';

import { AuthService } from '../services/auth.service';
import { ProviderAuthService } from '../services/provider-auth.service';

export const ANONYMOUS_API_REQUEST = new HttpContextToken(() => false);

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
  const api = new URL(environment.apiBaseUrl);
  const request = new URL(req.url, globalThis.location?.origin ?? api.origin);
  const path = request.pathname;
  const prefix = api.pathname.replace(/\/$/, '') + '/';
  if (request.origin !== api.origin || !path.startsWith(prefix)) {
    return next(req.clone({ headers: req.headers.delete('Authorization') }));
  }
  if (req.context.get(ANONYMOUS_API_REQUEST)) return next(req.clone({ headers: req.headers.delete('Authorization') }));

  // Requests with their own explicit credentials manage their own session.
  if (req.headers.has('Authorization')) return next(req);

  const authService = inject(AuthService);
  const providerAuthService = inject(ProviderAuthService);

  // Requests targeting the Admin API (/api/v1/admin/) are managed exclusively by the Admin auth interceptor
  const isAdminApi = /^admin(\/|$)/.test(path.slice(prefix.length));
  if (isAdminApi) {
    return next(req);
  }

  const isProviderApi = /^providers?(\/|$)/.test(path.slice(prefix.length));
  const session = isProviderApi ? providerAuthService : authService;
  const token = session.getToken();

  let outgoingReq = req;

  // Attach token if available and request is targeting the CeylonGo API
  if (token) {
    outgoingReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(outgoingReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 on an authenticated endpoint, purge the corresponding session
      if (error.status === 401 && session.getToken() === token) {
        if (
          isProviderApi &&
          !path.includes('/providers/login') &&
          !path.includes('/providers/password/setup')
        ) {
          providerAuthService.logout();
        } else if (
          !isProviderApi &&
          !path.includes('/auth/login') &&
          !path.includes('/auth/google')
        ) {
          authService.logout();
        }
      }
      return throwError(() => error);
    })
  );
};
