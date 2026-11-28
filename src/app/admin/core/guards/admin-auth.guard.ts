import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of, Observable } from 'rxjs';

import { AdminAuthService } from '../services/admin-auth.service';

/**
 * Route guard that ensures the caller has an active, authenticated Admin session.
 * On first navigation (token present but user signal may be null after page refresh),
 * calls reconcileSession() to verify the token against the live backend and hydrate
 * the currentUser signal before allowing the layout and child routes to render.
 * Unauthenticated requests are redirected to /admin/login preserving returnUrl.
 */
export const adminAuthGuard: CanActivateFn = (
  _route,
  state
): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);

  // No token at all — redirect immediately
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/admin/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  // Token present but currentUser not yet hydrated (e.g. page refresh):
  // reconcile with the backend before activating the layout.
  if (!authService.currentUser()) {
    return authService.reconcileSession().pipe(
      map((user) => {
        if (!user || user.is_active === false) {
          return router.createUrlTree(['/admin/login'], {
            queryParams: { returnUrl: state.url },
          });
        }
        return true;
      }),
      catchError(() => {
        // Network error (status 0) — allow access with existing token;
        // 401/403 are handled inside reconcileSession() which calls logout().
        return of(authService.isAuthenticated()
          ? (true as boolean | UrlTree)
          : router.createUrlTree(['/admin/login'], {
              queryParams: { returnUrl: state.url },
            }));
      })
    );
  }

  return true;
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
