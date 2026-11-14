import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

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
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  email = '';
  token = '';
  isTokenValid = false;

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
    const queryToken = this.route.snapshot.queryParamMap.get('token');
    const stateToken = history.state?.token;
    const initialToken = (queryToken || stateToken || '').trim();

    this.email = (history.state?.email || '').trim().toLowerCase();

    if (initialToken) {
      this.verifyToken(initialToken);
    } else {
      this.isTokenValid = false;
      this.errorMessage =
        'This password reset link is invalid or has expired. Please request a new link.';
    }
  }

  private verifyToken(token: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .verifyResetToken(token)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (res) => {
          this.token = token;
          this.isTokenValid = true;
          this.email = res.email;
        },
        error: (err: HttpErrorResponse) => {
          this.isTokenValid = false;
          this.token = '';
          if (err.status === 400) {
            this.errorMessage =
              err.error?.detail ||
              'This password reset link is invalid or has expired. Please request a new link.';
          } else if (err.status === 0) {
            this.errorMessage =
              'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.';
          } else {
            this.errorMessage =
              'This password reset link is invalid or has expired. Please request a new link.';
          }
        },
      });
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

    this.authService
      .resetPassword({ token: this.token, new_password: newPassword })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/reset-success'], {
            state: { email: this.email },
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 400) {
            this.errorMessage =
              err.error?.detail ||
              'This reset token is invalid, expired, or has already been used.';
          } else if (err.status === 0) {
            this.errorMessage =
              'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.';
          } else {
            this.errorMessage =
              err.error?.detail ||
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
    this.router.navigate(['/login'], {
      queryParams: this.email ? { email: this.email } : undefined,
    });
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement)?.classList.contains('reset-page')) {
      this.closeModal();
    }
  }
}
