import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

export const PROVIDER_RESET_EMAIL_KEY = 'ceylongo_provider_reset_email';

@Component({
  selector: 'app-provider-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './provider-forgot-password.html',
  styleUrl: './provider-forgot-password.scss',
})
export class ProviderForgotPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly isSubmitting = signal<boolean>(false);
  readonly isSubmitted = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly submittedEmail = signal<string>('');

  readonly forgotForm = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
      ],
    ],
  });

  get emailControl() {
    return this.forgotForm.get('email');
  }

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email');
    if (emailParam) {
      this.forgotForm.patchValue({ email: emailParam.trim().toLowerCase() });
    }
  }

  onSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.errorMessage.set(null);

    if (this.isSubmitting()) {
      return;
    }

    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    const email = (this.forgotForm.value.email || '').trim().toLowerCase();
    this.isSubmitting.set(true);

    this.authService
      .forgotPassword(email)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.submittedEmail.set(email);
          this.isSubmitted.set(true);
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(PROVIDER_RESET_EMAIL_KEY, email);
            }
          } catch {
            // Ignore storage errors in restricted contexts
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 429) {
            this.errorMessage.set(
              'Too many password reset requests. Please wait a few moments before trying again.'
            );
          } else if (err.status === 0) {
            this.errorMessage.set(
              'Cannot connect to server. Please verify the backend is running on http://127.0.0.1:8000.'
            );
          } else {
            // Anti-enumeration protection: Treat other responses uniformly as submitted confirmation
            this.submittedEmail.set(email);
            this.isSubmitted.set(true);
            try {
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem(PROVIDER_RESET_EMAIL_KEY, email);
              }
            } catch {
              // Ignore
            }
          }
        },
      });
  }

  resendLink(): void {
    this.isSubmitted.set(false);
    this.errorMessage.set(null);
  }

  backToLogin(): void {
    const email = this.submittedEmail() || (this.forgotForm.value.email || '').trim().toLowerCase();
    if (email) {
      this.router.navigate(['/provider/login'], { queryParams: { email } });
    } else {
      this.router.navigate(['/provider/login']);
    }
  }
}
