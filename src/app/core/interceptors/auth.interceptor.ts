import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP Interceptor that attaches the JWT Bearer token
 * to authenticated backend requests targeting CeylonGo APIs (/api/v1/).
 *
 * Handles HTTP 401 Unauthorized responses for protected resources by
 * clearing stale session state via authService.logout().
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

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
      // If 401 on an authenticated endpoint (excluding login/google authentication), purge session
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/google')
      ) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
