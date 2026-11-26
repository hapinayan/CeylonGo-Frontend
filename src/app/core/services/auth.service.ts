import { HttpClient, HttpParams } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
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
  PasswordChangeRequest,
  PasswordChangeResponse,
  ProfilePatchRequest,
  RegisterRequest,
  RegisterResponse,
  ResendEmailOtpRequest,
  ResendEmailOtpResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  User,
  VerifyEmailRequest,
  VerifyEmailResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  VerifyResetTokenResponse,
} from '../models/auth.models';

const TOKEN_KEY = 'ceylongo_access_token';
const USER_KEY = 'ceylongo_user';

/**
 * Centralized Authentication Service for CeylonGo Frontend.
 * Connects directly to the Python FastAPI backend (/api/v1/auth).
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;
  private readonly usersUrl = `${environment.apiBaseUrl}/users`;

  private readonly tokenSignal = signal<string | null>(this.loadStoredToken());
  private readonly currentUserSignal = signal<User | null>(this.loadStoredUser());
  private readonly avatarObjectUrlSignal = signal<string | null>(null);
  private avatarFetchSeq = 0;

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly avatarUrl = this.avatarObjectUrlSignal.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeAvatarObjectUrl());

    const initialUser = this.currentUserSignal();
    if (this.tokenSignal() && initialUser?.avatar_url) {
      this.syncAvatarBlob(initialUser);
    }
  }

  checkEmail(email: string): Observable<CheckEmailResponse> {
    const payload: CheckEmailRequest = { email: email.trim().toLowerCase() };
    return this.http.post<CheckEmailResponse>(`${this.authUrl}/check-email`, payload);
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authUrl}/register`, payload);
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, payload).pipe(
      tap((response) => {
        this.setSession(response.access_token, response.user);
      }),
    );
  }

  loginWithGoogle(idToken: string): Observable<LoginResponse> {
    const payload: GoogleAuthRequest = { id_token: idToken };
    return this.http.post<LoginResponse>(`${this.authUrl}/google`, payload).pipe(
      tap((response) => {
        this.setSession(response.access_token, response.user);
      }),
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    const payload: ForgotPasswordRequest = { email: email.trim().toLowerCase() };
    return this.http.post<ForgotPasswordResponse>(`${this.authUrl}/forgot-password`, payload);
  }

  verifyResetToken(token: string): Observable<VerifyResetTokenResponse> {
    const params = new HttpParams().set('token', token.trim());
    return this.http.get<VerifyResetTokenResponse>(`${this.authUrl}/verify-reset-token`, { params });
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${this.authUrl}/reset-password`, payload);
  }

  verifyEmail(payload: VerifyEmailRequest): Observable<VerifyEmailResponse> {
    return this.http.post<VerifyEmailResponse>(`${this.authUrl}/verify-email`, payload);
  }

  resendEmailOtp(payload: ResendEmailOtpRequest): Observable<ResendEmailOtpResponse> {
    return this.http.post<ResendEmailOtpResponse>(`${this.authUrl}/resend-email-otp`, payload);
  }

  verifyOtp(payload: VerifyEmailRequest): Observable<VerifyEmailResponse> {
    return this.verifyEmail(payload);
  }

  resendOtp(payload: ResendEmailOtpRequest): Observable<ResendEmailOtpResponse> {
    return this.resendEmailOtp(payload);
  }

  /**
   * Fetch current authenticated traveler profile via protected GET /api/v1/auth/me.
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.authUrl}/me`).pipe(
      tap((user) => {
        if (!this.isAuthenticated()) return;
        this.updateUserState(user);
      }),
    );
  }

  /**
   * Partial profile update via PATCH /api/v1/auth/me.
   */
  updateProfile(payload: ProfilePatchRequest): Observable<User> {
    return this.http.patch<User>(`${this.authUrl}/me`, payload).pipe(
      tap((user) => {
        if (!this.isAuthenticated()) return;
        this.updateUserState(user);
      }),
    );
  }

  /**
   * Upload or replace profile photo via POST /api/v1/auth/me/avatar (multipart field: "file").
   */
  uploadAvatar(file: File): Observable<User> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<User>(`${this.authUrl}/me/avatar`, formData).pipe(
      tap((user) => {
        if (!this.isAuthenticated()) return;
        this.updateUserState(user, true);
      }),
    );
  }

  /**
   * Remove profile photo via DELETE /api/v1/auth/me/avatar.
   */
  deleteAvatar(): Observable<User> {
    return this.http.delete<User>(`${this.authUrl}/me/avatar`).pipe(
      tap((user) => {
        if (!this.isAuthenticated()) return;
        this.updateUserState(user, true);
      }),
    );
  }

  /**
   * Change password via POST /api/v1/auth/change-password and clear invalidated session when required.
   */
  changePassword(payload: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    return this.http.post<PasswordChangeResponse>(`${this.authUrl}/change-password`, payload).pipe(
      tap((res) => {
        if (res?.login_required !== false) {
          this.logout();
        }
      }),
    );
  }

  /**
   * Log out the traveler and purge all session tokens and transient avatar object URLs.
   */
  logout(): void {
    this.avatarFetchSeq++;
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.revokeAvatarObjectUrl();
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      } catch {
        // Ignore storage exceptions
      }
    }
  }

  getToken(): string | null {
    return this.tokenSignal() || this.loadStoredToken();
  }

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
    this.syncAvatarBlob(user, true);
  }

  private updateUserState(user: User, forceAvatarRefresh = false): void {
    const prevAvatar = this.currentUserSignal()?.avatar_url;
    this.currentUserSignal.set(user);
    this.saveStoredUser(user);
    if (forceAvatarRefresh || user.avatar_url !== prevAvatar || (!this.avatarObjectUrlSignal() && user.avatar_url)) {
      this.syncAvatarBlob(user, forceAvatarRefresh);
    }
  }

  private syncAvatarBlob(user: User, forceRefresh = false): void {
    const seq = ++this.avatarFetchSeq;
    if (!user.avatar_url || !this.isAuthenticated()) {
      this.revokeAvatarObjectUrl();
      return;
    }

    if (user.avatar_url.startsWith('data:') || user.avatar_url.startsWith('blob:')) {
      this.revokeAvatarObjectUrl();
      this.avatarObjectUrlSignal.set(user.avatar_url);
      return;
    }

    const baseAvatarUrl = `${this.usersUrl}/${user.id}/avatar`;
    const cacheBust = forceRefresh ? `?t=${Date.now()}` : '';
    const tokenAtStart = this.getToken();

    this.http.get(`${baseAvatarUrl}${cacheBust}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (seq !== this.avatarFetchSeq || !this.isAuthenticated() || this.getToken() !== tokenAtStart) {
          return;
        }
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && blob && blob.size > 0) {
          const objectUrl = URL.createObjectURL(blob);
          this.revokeAvatarObjectUrl();
          this.avatarObjectUrlSignal.set(objectUrl);
        }
      },
      error: () => {
        if (seq === this.avatarFetchSeq) {
          this.revokeAvatarObjectUrl();
        }
      },
    });
  }

  private revokeAvatarObjectUrl(): void {
    const existing = this.avatarObjectUrlSignal();
    if (existing && existing.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(existing);
      } catch {
        // Ignore revocation failures
      }
    }
    this.avatarObjectUrlSignal.set(null);
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
