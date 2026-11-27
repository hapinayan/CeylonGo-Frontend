import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { TravelerHome } from '../traveler-home/traveler-home';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, TravelerHome],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  email = '';
  token = '';
  isTokenValid = false;
  isNetworkOrServerError = false;
  activeVerifyingToken: string | null = null;

  showPassword = false;
  showConfirmPassword = false;

  errorMessage = '';
  isLoading = false;

  resetForm = this.fb.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: passwordsMatch,
    }
  );

  ngOnInit(): void {
    this.email = this.getEmailFromFallback();

    if (this.route.queryParamMap) {
      this.route.queryParamMap
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params) => {
          const qEmail = params.get('email');
          if (qEmail) {
            this.email = qEmail.trim().toLowerCase();
          }
          const qToken = params.get('token');
          if (qToken) {
            const clean = qToken.trim();
            if (clean && clean !== this.token && !this.isLoading) {
              this.verifyToken(clean);
            }
          }
        });
    }

    const token = this.getTokenFromFallback();
    if (token) {
      this.verifyToken(token);
    } else {
      this.isLoading = false;
      this.isTokenValid = false;
      this.isNetworkOrServerError = false;
      this.errorMessage =
        'This password reset link is invalid or has expired. Please request a new link.';
      this.cdr.markForCheck();
    }
  }

  private getTokenFromFallback(): string {
    const queryToken = this.route.snapshot?.queryParamMap?.get('token');
    if (queryToken) return queryToken.trim();

    const stateToken = history?.state?.token;
    if (stateToken) return stateToken.trim();

    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const searchToken = urlParams.get('token');
        if (searchToken) return searchToken.trim();
      }
    } catch {
      // Ignore
    }

    return '';
  }

  private getEmailFromFallback(): string {
    const queryEmail = this.route.snapshot?.queryParamMap?.get('email');
    if (queryEmail) return queryEmail.trim().toLowerCase();

    const stateEmail = history?.state?.email;
    if (stateEmail) return stateEmail.trim().toLowerCase();

    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const searchEmail = urlParams.get('email');
        if (searchEmail) return searchEmail.trim().toLowerCase();
      }
    } catch {
      // Ignore
    }

    return '';
  }

  verifyToken(token: string): void {
    const cleanToken = (token || '').trim();
    if (!cleanToken || cleanToken.length < 10) {
      this.isLoading = false;
      this.isTokenValid = false;
      this.isNetworkOrServerError = false;
      this.errorMessage =
        'This password reset link is invalid or has expired. Please request a new link.';
      this.cdr.markForCheck();
      return;
    }

    if (this.isLoading && this.activeVerifyingToken === cleanToken) {
      return;
    }

    this.activeVerifyingToken = cleanToken;
    this.isLoading = true;
    this.errorMessage = '';
    this.isNetworkOrServerError = false;
    this.cdr.markForCheck();

    this.authService
      .verifyResetToken(cleanToken)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.activeVerifyingToken = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (res) => {
          let storedProviderEmail = '';
          try {
            if (typeof localStorage !== 'undefined') {
              storedProviderEmail = localStorage.getItem('ceylongo_provider_reset_email') || '';
            }
          } catch {
            // Ignore
          }

          const isProvider =
            this.route.snapshot?.queryParamMap?.get('portal') === 'provider' ||
            (storedProviderEmail && storedProviderEmail.toLowerCase() === res.email.toLowerCase());

          if (isProvider) {
            void this.router.navigate(['/provider/reset-password'], {
              state: { token: cleanToken, email: res.email },
              queryParams: { token: cleanToken },
              replaceUrl: true,
            });
            return;
          }

          this.token = cleanToken;
          this.isTokenValid = true;
          this.isNetworkOrServerError = false;
          this.email = res.email || this.email;
          this.errorMessage = '';
        },
        error: (err: HttpErrorResponse | any) => {
          this.isTokenValid = false;
          this.token = '';

          const isTimeout =
            err?.name === 'TimeoutError' ||
            (err instanceof Error && err.name === 'TimeoutError');
          const isNetwork = err?.status === 0;
          const isServer =
            typeof err?.status === 'number' && (err.status >= 500 || err.status === 429);

          if (isTimeout) {
            this.isNetworkOrServerError = true;
            this.errorMessage =
              'Verification request timed out. Please check your internet connection and try again.';
          } else if (isNetwork) {
            this.isNetworkOrServerError = true;
            this.errorMessage =
              'Unable to connect to CeylonGo server. Please check your internet connection or server availability.';
          } else if (isServer) {
            this.isNetworkOrServerError = true;
            this.errorMessage =
              'Server is currently unable to verify your link. Please try again in a few moments.';
          } else if (err?.status === 400 || err?.status === 422) {
            this.isNetworkOrServerError = false;
            this.errorMessage =
              this.extractErrorMessage(err) ||
              'This password reset link is invalid or has expired. Please request a new link.';
          } else {
            this.isNetworkOrServerError = false;
            this.errorMessage =
              this.extractErrorMessage(err) ||
              'This password reset link is invalid or has expired. Please request a new link.';
          }
        },
      });
  }

  retryVerification(): void {
    const token = this.token || this.getTokenFromFallback();
    if (token) {
      this.verifyToken(token);
    } else {
      this.errorMessage =
        'This password reset link is invalid or has expired. Please request a new link.';
      this.isNetworkOrServerError = false;
      this.cdr.markForCheck();
    }
  }

  private extractErrorMessage(err: any): string {
    if (!err) return '';
    const detail = err.error?.detail ?? err.error?.message ?? err.message;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === 'string') {
        return first;
      }
      if (first && typeof first === 'object' && typeof first.msg === 'string') {
        return first.msg;
      }
    }
    return '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  resetPassword(): void {
    this.errorMessage = '';

    if (this.isLoading) {
      return;
    }

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (!this.token || !this.isTokenValid) {
      this.errorMessage =
        'This password reset link is invalid or has expired. Please request a new link.';
      return;
    }

    const newPassword = this.resetForm.value.password || '';

    this.isLoading = true;
    this.cdr.markForCheck();

    this.authService
      .resetPassword({ token: this.token, new_password: newPassword })
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/reset-success'], {
            state: { email: this.email, verified: true },
            queryParams: this.email ? { email: this.email } : undefined,
          });
        },
        error: (err: HttpErrorResponse | any) => {
          const isTimeout =
            err?.name === 'TimeoutError' ||
            (err instanceof Error && err.name === 'TimeoutError');
          const isNetwork = err?.status === 0;

          if (isTimeout) {
            this.errorMessage = 'Password reset request timed out. Please try again.';
          } else if (isNetwork) {
            this.errorMessage =
              'Unable to connect to CeylonGo server. Please check your internet connection or server availability.';
          } else if (err?.status === 400 || err?.status === 422) {
            this.errorMessage =
              this.extractErrorMessage(err) ||
              'This reset token is invalid, expired, or has already been used.';
          } else {
            this.errorMessage =
              this.extractErrorMessage(err) ||
              'Unable to reset password. Please try again.';
          }
        },
      });
  }

  requestNewResetLink(): void {
    this.router.navigate(['/forgot-password'], {
      queryParams: this.email ? { email: this.email } : undefined,
    });
  }

  backToLogin(): void {
    this.authModalService.open('login');
    if (this.email) {
      this.authModalService.userEmail.set(this.email);
    }
    this.router.navigate(['/']);
  }

  closeModal(): void {
    this.router.navigate(['/']);
  }

  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target?.classList.contains('reset-page') || target?.classList.contains('auth-modal-backdrop')) {
      this.closeModal();
    }
  }
}
