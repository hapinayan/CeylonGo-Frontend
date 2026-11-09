import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../models/auth.models';

const TOKEN_KEY = 'ceylongo_access_token';
const USER_KEY = 'ceylongo_user';

/**
 * Centralized Authentication Service for CeylonGo Frontend.
 *
 * Token Management Strategy & Persistence Trade-offs:
 * - In-Memory State: Fast, reactive via Angular Signals, and secure against
 *   malicious script access to Web Storage.
 * - SessionStorage Backup: Synced for development convenience to persist
 *   the session across page reloads in the active tab without exposing
 *   credentials indefinitely across browser sessions (as localStorage would).
 * - Sensitive Data: Tokens and raw passwords are never logged to console or telemetry.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBaseUrl;

  private readonly tokenSignal = signal<string | null>(this.loadStoredToken());
  private readonly currentUserSignal = signal<User | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();

  /**
   * Register a new traveler account.
   */
  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.apiUrl}/auth/register`,
      payload
    );
  }

  /**
   * Authenticate traveler and store session in memory.
   */
  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, payload)
      .pipe(
        tap((response) => {
          this.setSession(response.access_token, response.user);
        })
      );
  }

  /**
   * Fetch current authenticated traveler profile via protected /auth/me endpoint.
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => {
        this.currentUserSignal.set(user);
        this.saveStoredUser(user);
      })
    );
  }

  /**
   * Log out the traveler and purge in-memory / session storage tokens.
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Get the current JWT access token for interceptors and authenticated requests.
   */
  getToken(): string | null {
    return this.tokenSignal() || this.loadStoredToken();
  }

  /**
   * Check whether user is currently authenticated.
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
        // Fallback gracefully if storage is restricted
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

