import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AdminAuthService } from '../services/admin-auth.service';

/**
 * Functional HTTP Interceptor for CeylonGo Admin API requests.
 *
 * Attaches the Admin JWT Bearer token to all /api/v1/admin/* requests.
 * Catches 401 Unauthorized responses and terminates the admin session
 * (excluding the login endpoint itself).
 */
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const api = new URL(environment.apiBaseUrl);
  const requestUrl = new URL(req.url, globalThis.location?.origin ?? api.origin);
  const path = requestUrl.pathname;
  const prefix = api.pathname.replace(/\/$/, '') + '/';

  // Only intercept requests destined for CeylonGo API
  if (requestUrl.origin !== api.origin || !path.startsWith(prefix)) {
    return next(req);
  }

  const relativePath = path.slice(prefix.length);
  const isAdminApi = /^admin(\/|$)/.test(relativePath);

  if (!isAdminApi) {
    return next(req);
  }

  const adminAuthService = inject(AdminAuthService);
  const token = adminAuthService.getToken();

  let outgoingReq = req;
  if (token && !req.headers.has('Authorization')) {
    outgoingReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(outgoingReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !path.includes('/admin/auth/login')) {
        adminAuthService.logout();
      }
      return throwError(() => error);
    })
  );
};
