import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ProviderAuthError,
  ProviderLoginRequest,
  ProviderLoginResponse,
  ProviderUser,
} from '../models/provider-auth.models';

const PROVIDER_TOKEN_KEY = 'ceylongo_provider_access_token';
const PROVIDER_USER_KEY = 'ceylongo_provider_user';

/**
 * Service Provider Authentication Service for CeylonGo Frontend.
 * Integrates directly with Python FastAPI /api/v1/providers/login.
 *
 * Security & Isolation Guarantees:
 * - Dedicated storage keys to completely isolate provider sessions from traveler accounts.
 * - Reactive Angular Signals as primary in-memory state.
 * - Transient sessionStorage backup across page refreshes.
 * - User passwords are NEVER cached, logged, or serialized.
 */
@Injectable({
  providedIn: 'root',
})
export class ProviderAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/providers`;

  private readonly tokenSignal = signal<string | null>(this.loadStoredToken());
  private readonly currentUserSignal = signal<ProviderUser | null>(this.loadStoredUser());

  readonly currentProviderUser = this.currentUserSignal.asReadonly();
  readonly providerToken = this.tokenSignal.asReadonly();

  /**
   * Authenticate approved service provider with email and password.
   * On 200 OK, stores JWT access token and user profile into isolated provider session.
   */
  login(payload: ProviderLoginRequest): Observable<ProviderLoginResponse> {
    const normalizedPayload: ProviderLoginRequest = {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    };

    return this.http
      .post<ProviderLoginResponse>(`${this.baseUrl}/login`, normalizedPayload)
      .pipe(
        tap((response) => {
          this.setSession(response.access_token, response.user);
        }),
        catchError((error: HttpErrorResponse) => {
          return throwError(() => this.formatApiError(error));
        })
      );
  }

  /**
   * Store active session in memory and sessionStorage.
   */
  setSession(token: string, user: ProviderUser): void {
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(PROVIDER_TOKEN_KEY, token);
        sessionStorage.setItem(PROVIDER_USER_KEY, JSON.stringify(user));
      } catch {
        // Ignore storage access errors
      }
    }
  }

  /**
   * Clear provider session and remove credentials from storage.
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(PROVIDER_TOKEN_KEY);
        sessionStorage.removeItem(PROVIDER_USER_KEY);
      } catch {
        // Ignore storage access errors
      }
    }
  }

  /**
   * Retrieve active JWT access token.
   */
  getToken(): string | null {
    return this.tokenSignal() || this.loadStoredToken();
  }

  /**
   * Retrieve current provider user data.
   */
  getUser(): ProviderUser | null {
    return this.currentUserSignal() || this.loadStoredUser();
  }

  /**
   * Check whether an active token exists.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Verify provider role and active approved status.
   */
  isApprovedProvider(): boolean {
    const user = this.getUser();
    if (!user) return false;
    return (
      user.role === 'provider' &&
      user.approval_status === 'approved' &&
      user.is_active === true
    );
  }

  private loadStoredToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      try {
        return sessionStorage.getItem(PROVIDER_TOKEN_KEY);
      } catch {
        return null;
      }
    }
    return null;
  }

  private loadStoredUser(): ProviderUser | null {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(PROVIDER_USER_KEY);
        return raw ? (JSON.parse(raw) as ProviderUser) : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private formatApiError(error: HttpErrorResponse): ProviderAuthError {
    let message = 'Unable to connect to the server. Please check your internet connection.';

    if (error.status === 401) {
      message = 'Invalid email or password. Please verify your credentials and try again.';
    } else if (error.status === 403) {
      const detail = error.error?.detail || '';
      if (typeof detail === 'string' && detail.trim()) {
        message = detail;
      } else {
        message = 'Your provider account is not authorized to sign in. Please verify your approval status.';
      }
    } else if (error.status === 429) {
      message = 'Too many login attempts. Please wait a moment before trying again.';
    } else if (error.status === 422) {
      message = 'Please provide a valid email address and password.';
    } else if (error.error?.detail) {
      if (typeof error.error.detail === 'string') {
        message = error.error.detail;
      } else if (Array.isArray(error.error.detail)) {
        message = error.error.detail.map((d: { msg?: string }) => d.msg || '').join(', ');
      }
    }

    return {
      status: error.status,
      message,
    };
  }
}
