import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CheckEmailRequest,
  CheckEmailResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GoogleAuthRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  User,
  VerifyResetTokenResponse,
} from '../models/auth.models';

const TOKEN_KEY = 'ceylongo_access_token';
const USER_KEY = 'ceylongo_user';

/**
 * Centralized Authentication Service for CeylonGo Frontend.
 * Connects directly to the Python FastAPI backend (/api/v1/auth).
 *
 * Security & Token Storage Strategy:
 * - In-Memory State: Primary reactive storage using Angular Signals. Fast and
 *   isolated from long-term storage vulnerabilities.
 * - SessionStorage Backup: Transient fallback to preserve active session across
 *   page reloads within the same browser tab without indefinite persistence.
 * - Sensitive Data Guarantee: User passwords are NEVER stored in memory or storage.
 * - Refresh-Token Note: The backend currently issues stateless JWT access tokens
 *   without separate refresh tokens; token renewal is handled via re-authentication.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;

  private readonly tokenSignal = signal<string | null>(this.loadStoredToken());
  private readonly currentUserSignal = signal<User | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();

  /**
   * Check whether an email address is already registered in CeylonGo.
   */
  checkEmail(email: string): Observable<CheckEmailResponse> {
    const payload: CheckEmailRequest = { email: email.trim().toLowerCase() };
    return this.http.post<CheckEmailResponse>(
      `${this.authUrl}/check-email`,
      payload
    );
  }

  /**
   * Register a new traveler account with full name, email, and password.
   */
  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.authUrl}/register`,
      payload
    );
  }

  /**
   * Authenticate traveler with email and password, storing the issued JWT session.
   */
  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.authUrl}/login`, payload)
      .pipe(
        tap((response) => {
          this.setSession(response.access_token, response.user);
        })
      );
  }

  /**
   * Authenticate traveler using a Google Identity Services ID token.
   */
  loginWithGoogle(idToken: string): Observable<LoginResponse> {
    const payload: GoogleAuthRequest = { id_token: idToken };
    return this.http
      .post<LoginResponse>(`${this.authUrl}/google`, payload)
      .pipe(
        tap((response) => {
          this.setSession(response.access_token, response.user);
        })
      );
  }

  /**
   * Request a password reset link for the specified email address.
   */
  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    const payload: ForgotPasswordRequest = { email: email.trim().toLowerCase() };
    return this.http.post<ForgotPasswordResponse>(
      `${this.authUrl}/forgot-password`,
      payload
    );
  }

  /**
   * Verify the validity and expiration of a password reset token.
   */
  verifyResetToken(token: string): Observable<VerifyResetTokenResponse> {
    const params = new HttpParams().set('token', token.trim());
    return this.http.get<VerifyResetTokenResponse>(
      `${this.authUrl}/verify-reset-token`,
      { params }
    );
  }

  /**
   * Reset traveler password using a verified single-use reset token.
   */
  resetPassword(payload: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(
      `${this.authUrl}/reset-password`,
      payload
    );
  }

  /**
   * Fetch current authenticated traveler profile via protected /api/v1/auth/me.
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.authUrl}/me`).pipe(
      tap((user) => {
        this.currentUserSignal.set(user);
        this.saveStoredUser(user);
      })
    );
  }

  /**
   * Log out the traveler and purge all session tokens.
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      } catch {
        // Ignore storage exceptions
      }
    }
  }

  /**
   * Retrieve current active JWT access token for HTTP authorization headers.
   */
  getToken(): string | null {
    return this.tokenSignal() || this.loadStoredToken();
  }

  /**
   * Check whether traveler is currently logged in.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private setSession(token: string, user: User): void {
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // Fallback gracefully
      }
    }
  }

  private loadStoredToken(): string | null {
    if (typeof sessionStorage !== 'undefined') {
      try {
        return sessionStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    }
    return null;
  }

  private loadStoredUser(): User | null {
    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private saveStoredUser(user: User): void {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // Fallback gracefully
      }
    }
  }
}
