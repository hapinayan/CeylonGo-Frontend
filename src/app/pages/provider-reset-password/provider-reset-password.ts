import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { PROVIDER_RESET_EMAIL_KEY } from '../provider-forgot-password/provider-forgot-password';

@Component({
  selector: 'app-provider-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './provider-reset-password.html',
  styleUrl: './provider-reset-password.scss',
})
export class ProviderResetPassword implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly token = signal<string>('');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');

  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  readonly isVerifying = signal<boolean>(true);
  readonly isTokenValid = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Requirements checks
  readonly hasMinLength = computed(() => (this.password() || '').length >= 12);
  readonly hasMaxLength = computed(() => (this.password() || '').length <= 128);
  readonly isExceedingMaxLength = computed(() => (this.password() || '').length > 128);
  readonly hasUppercase = computed(() => /[A-Z]/.test(this.password() || ''));
  readonly hasLowercase = computed(() => /[a-z]/.test(this.password() || ''));
  readonly hasNumber = computed(() => /[0-9]/.test(this.password() || ''));
  readonly hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(this.password() || ''));

  readonly passwordsMatch = computed(() => {
    const p = this.password();
    const c = this.confirmPassword();
    return !!p && !!c && p === c;
  });

  readonly isFormValid = computed(() => {
    return (
      this.hasMinLength() &&
      this.hasMaxLength() &&
      this.hasUppercase() &&
      this.hasLowercase() &&
      this.hasNumber() &&
      this.hasSpecialChar() &&
      this.passwordsMatch() &&
      this.isTokenValid() &&
      !this.isSubmitting()
    );
  });

  ngOnInit(): void {
    const queryToken = this.route.snapshot.queryParamMap.get('token');
    const nav = this.router.getCurrentNavigation();
    const navState = nav?.extras?.state;
    const historyState = typeof history !== 'undefined' ? history.state : null;
    const stateToken = (navState && navState['token']) || (historyState && historyState['token']) || null;
    const stateEmail = (navState && navState['email']) || (historyState && historyState['email']) || null;

    let storedEmail = '';
    try {
      if (typeof localStorage !== 'undefined') {
        storedEmail = localStorage.getItem(PROVIDER_RESET_EMAIL_KEY) || '';
      }
    } catch {
      // Ignore
    }

    if (stateEmail || storedEmail) {
      this.email.set((stateEmail || storedEmail).trim().toLowerCase());
    }

    const capturedToken = (queryToken || stateToken || '').trim();

    // Strip sensitive token immediately from URL
    if (this.route.snapshot.queryParamMap.has('token')) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { token: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    if (!capturedToken) {
      this.isVerifying.set(false);
      this.isTokenValid.set(false);
      this.errorMessage.set(
        'This password reset link is invalid or has expired. Please request a new link.'
      );
      return;
    }

    this.verifyToken(capturedToken);
  }

  private verifyToken(token: string): void {
    this.isVerifying.set(true);
    this.errorMessage.set(null);

    this.authService
      .verifyResetToken(token)
      .pipe(
        finalize(() => {
          this.isVerifying.set(false);
        })
      )
      .subscribe({
        next: (res) => {
          this.token.set(token);
          this.isTokenValid.set(true);
          if (res.email) {
            this.email.set(res.email.trim().toLowerCase());
          }
        },
        error: (err: HttpErrorResponse) => {
          this.isTokenValid.set(false);
          this.token.set('');
          if (err.status === 0) {
            this.errorMessage.set(
              'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.'
            );
          } else {
            this.errorMessage.set(
              err.error?.detail ||
                'This password reset link is invalid or has expired. Please request a new link.'
            );
          }
        },
      });
  }

  onPasswordInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.password.set(target.value);
    this.errorMessage.set(null);
  }

  onConfirmPasswordInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.confirmPassword.set(target.value);
    this.errorMessage.set(null);
  }

  onSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.isFormValid() || this.isSubmitting() || !this.token()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService
      .resetPassword({
        token: this.token(),
        new_password: this.password(),
      })
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.isSuccess.set(true);
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(PROVIDER_RESET_EMAIL_KEY);
            }
          } catch {
            // Ignore
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 0) {
            this.errorMessage.set(
              'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.'
            );
          } else {
            this.errorMessage.set(
              err.error?.detail ||
                'Unable to reset password. The link may have expired or already been used.'
            );
          }
        },
      });
  }
}
