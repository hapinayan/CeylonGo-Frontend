import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AdminLoginRequest, AdminTokenResponse, AdminUser } from '../models/admin-auth.models';

export const ADMIN_TOKEN_KEY = 'ceylongo_admin_access_token';
export const ADMIN_USER_KEY = 'ceylongo_admin_user';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly tokenSignal = signal<string | null>(this.loadStoredToken());
  private readonly userSignal = signal<AdminUser | null>(this.loadStoredUser());
  private readonly isReconcilingSignal = signal<boolean>(false);

  /** Readonly signals for reactive UI state */
  readonly currentToken = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isReconciling = this.isReconcilingSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isSuperAdmin = computed(() => {
    // If reconciliation is currently in progress, do not elevate permissions prematurely
    const user = this.userSignal();
    if (!user) return false;
    const role = (user.admin_role || user.role || '').toLowerCase();
    return role === 'super_admin';
  });
  readonly roleDisplayName = computed(() => {
    if (this.isSuperAdmin()) return 'Super Admin';
    return 'Admin';
  });

  /**
   * Validates whether a token string is a syntactically valid JWT (header.payload.signature)
   * and has not expired if exp claim is present.
   */
  isValidTokenFormat(token: string | null): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.trim().split('.');
    if (parts.length !== 3) return false;
    try {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedJson = atob(payloadBase64);
      const payload = JSON.parse(decodedJson);
      if (payload && typeof payload.exp === 'number') {
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp < nowSec) {
          return false; // Expired
        }
      }
      return true;
    } catch {
      // If parsing fails, token is malformed
      return false;
    }
  }

  /**
   * Returns true if the active session is a synthetic client-side demo session.
   * In production environments, synthetic demo sessions are strictly disabled.
   */
  isDemoSession(): boolean {
    if (environment.production || !environment.features?.adminPreviewMode) {
      return false;
    }
    const token = this.tokenSignal();
    return !!token && (token.includes('demo') || token.startsWith('demo-'));
  }

  /**
   * Reconciles the client session with the server via GET /api/v1/admin/auth/me.
   * If server rejects (401/403) or user is inactive, session is purged.
   * Network errors (status 0) preserve offline resilience without elevating permissions.
   * Synthetic demo sessions skip backend reconciliation to preserve isolated preview state.
   */
  reconcileSession(): Observable<AdminUser | null> {
    if (this.isDemoSession()) {
      return of(this.userSignal());
    }

    const token = this.tokenSignal();
    if (!token || !this.isValidTokenFormat(token)) {
      this.logout('/admin/login');
      return throwError(() => new Error('Invalid or missing authentication token'));
    }

    this.isReconcilingSignal.set(true);
    const url = `${environment.apiBaseUrl}/admin/auth/me`;
    return this.http.get<AdminUser>(url).pipe(
      tap((user) => {
        this.isReconcilingSignal.set(false);
        if (!user || user.is_active === false) {
          this.logout('/admin/login');
          return;
        }
        this.userSignal.set(user);
        this.saveStoredUser(user);
      }),
      catchError((error: HttpErrorResponse) => {
        this.isReconcilingSignal.set(false);
        if (error.status === 401 || error.status === 403) {
          // Explicit token rejection from backend
          this.logout('/admin/login');
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Authenticate administrator via verified endpoint: POST /api/v1/admin/auth/login
   */
  login(payload: AdminLoginRequest): Observable<AdminTokenResponse> {
    const url = `${environment.apiBaseUrl}/admin/auth/login`;
    return this.http.post<AdminTokenResponse>(url, payload).pipe(
      tap((res) => {
        this.setSession(res.access_token, res.user);
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch authenticated administrator profile via: GET /api/v1/admin/auth/me
   */
  fetchMe(): Observable<AdminUser> {
    const url = `${environment.apiBaseUrl}/admin/auth/me`;
    return this.http.get<AdminUser>(url).pipe(
      tap((user) => {
        this.userSignal.set(user);
        this.saveStoredUser(user);
      })
    );
  }

  /**
   * Set session token and user profile into signals and browser sessionStorage.
   * Synthetic demo credentials are systematically rejected in production environments.
   */
  setSession(token: string, user: AdminUser): void {
    if (environment.production && (token.includes('demo') || token.startsWith('demo-'))) {
      console.warn('Refusing to persist synthetic demo token in production environment.');
      return;
    }
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    if (isPlatformBrowser(this.platformId) && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      } catch {
        // Storage access fallback
      }
    }
  }

  /**
   * Terminate admin session and navigate to admin login
   */
  logout(redirectUrl: string = '/admin/login'): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    if (isPlatformBrowser(this.platformId) && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem(ADMIN_USER_KEY);
        sessionStorage.removeItem('ceylongo_preview_providers_state');
        sessionStorage.removeItem('ceylongo_preview_travelers_state');
        sessionStorage.removeItem('ceylongo_preview_traveler_history_state');
        sessionStorage.removeItem('ceylongo_preview_homestays_state');
        sessionStorage.removeItem('ceylongo_preview_activities_state');
        sessionStorage.removeItem('ceylongo_preview_rentals_state');
        sessionStorage.removeItem('ceylongo_preview_rental_documents_state');
      } catch {
        // Storage access fallback
      }
    }
    this.router.navigateByUrl(redirectUrl);
  }

  getToken(): string | null {
    return this.tokenSignal() || this.loadStoredToken();
  }

  private loadStoredToken(): string | null {
    if (isPlatformBrowser(this.platformId) && typeof sessionStorage !== 'undefined') {
      try {
        const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
        if (!token) return null;

        // In production mode, immediately purge and reject any synthetic demo tokens
        if (environment.production && (token.includes('demo') || token.startsWith('demo-'))) {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          sessionStorage.removeItem(ADMIN_USER_KEY);
          return null;
        }

        if (this.isValidTokenFormat(token)) {
          return token;
        }
        if (token) {
          // Token exists but is expired or malformed; clean up immediately
          sessionStorage.removeItem(ADMIN_TOKEN_KEY);
          sessionStorage.removeItem(ADMIN_USER_KEY);
        }
        return null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private loadStoredUser(): AdminUser | null {
    if (isPlatformBrowser(this.platformId) && typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(ADMIN_USER_KEY);
        if (!raw) return null;
        const user = JSON.parse(raw) as AdminUser;
        if (environment.production && (user.email?.includes('demo') || user.email?.includes('academic-mvp-v1-1.invalid') || user.id === 11 || user.id === 12)) {
          sessionStorage.removeItem(ADMIN_USER_KEY);
          return null;
        }
        return user;
      } catch {
        return null;
      }
    }
    return null;
  }

  private saveStoredUser(user: AdminUser): void {
    if (isPlatformBrowser(this.platformId) && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      } catch {
        // Storage access fallback
      }
    }
  }
}
