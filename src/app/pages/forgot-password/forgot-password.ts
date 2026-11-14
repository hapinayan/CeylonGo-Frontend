import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  errorMessage = '';
  isLoading = false;

  forgotForm = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
      ],
    ],
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.forgotForm.patchValue({ email: email.trim().toLowerCase() });
    }
  }

  sendResetLink(): void {
    this.errorMessage = '';

    if (this.isLoading) {
      return;
    }

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const email = (this.forgotForm.value.email || '').trim().toLowerCase();

    this.isLoading = true;

    this.authService
      .forgotPassword(email)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/check-email'], {
            state: { email },
          });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 429) {
            this.errorMessage =
              'Too many password reset attempts. Please wait a few moments before trying again.';
          } else if (err.status === 0) {
            this.errorMessage =
              'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.';
          } else {
            this.errorMessage =
              err.error?.detail ||
              'Failed to process password reset request. Please try again.';
          }
        },
      });
  }

  goBack(): void {
    const email = (this.forgotForm.value.email || '').trim().toLowerCase();
    if (email) {
      this.router.navigate(['/login'], { queryParams: { email } });
    } else {
      this.router.navigate(['/login']);
    }
  }

  closeModal(): void {
    this.router.navigate(['/auth']);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement)?.classList.contains('forgot-page')) {
      this.closeModal();
    }
  }
}
