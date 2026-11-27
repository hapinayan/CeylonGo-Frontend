import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-entry',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-entry.html',
  styleUrl: './auth-entry.css',
})
export class AuthEntry implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);
  readonly socialMessage = signal('');

  emailForm = this.fb.group({
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
    this.initGoogleIdentityServices();
  }

  /**
   * Initialize Google Identity Services if client ID and window.google are present.
   */
  private initGoogleIdentityServices(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const googleObj = (window as unknown as { google?: any })?.google;
    if (environment.googleClientId && googleObj?.accounts?.id) {
      googleObj.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            this.handleGoogleCredential(response.credential);
          }
        },
      });
    }
  }

  // EMAIL LOGIN / REGISTER VIA REAL BACKEND (/api/v1/auth/check-email)
  continueWithEmail(): void {
    this.socialMessage.set('');

    if (this.isLoading()) {
      return;
    }

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const email = (this.emailForm.value.email ?? '').trim().toLowerCase();

    this.isLoading.set(true);

    this.authService.checkEmail(email).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.is_registered) {
          this.router.navigate(['/login'], {
            queryParams: { email },
          });
        } else {
          this.router.navigate(['/register'], {
            queryParams: { email },
          });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 429) {
          this.socialMessage.set(
            'Too many requests. Please wait a moment and try again.'
          );
        } else if (err.status === 0) {
          this.socialMessage.set(
            'Cannot connect to backend server. Please verify it is running on http://127.0.0.1:8000.'
          );
        } else {
          this.socialMessage.set(
            err.error?.detail ||
              'Unable to verify email address. Please try again.'
          );
        }
      },
    });
  }

  // GOOGLE SIGN-IN VIA GOOGLE IDENTITY SERVICES (/api/v1/auth/google)
  continueWithGoogle(): void {
    this.socialMessage.set('');

    if (!environment.googleClientId) {
      this.socialMessage.set(
        'Google Sign-In is configured on the backend. Set GOOGLE_CLIENT_ID in environment.ts to enable Google Identity Services in development.'
      );
      return;
    }

    const googleObj = (window as unknown as { google?: any })?.google;
    if (!googleObj?.accounts?.id) {
      this.socialMessage.set(
        'Google Identity Services is loading. Please check your internet connection and try again.'
      );
      return;
    }

    this.isLoading.set(true);
    googleObj.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential?: string }) => {
        if (response?.credential) {
          this.handleGoogleCredential(response.credential);
        } else {
          this.isLoading.set(false);
        }
      },
    });

    googleObj.accounts.id.prompt((notification: any) => {
      if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
        this.isLoading.set(false);
      }
    });
  }

  private handleGoogleCredential(credential: string): void {
    this.isLoading.set(true);
    this.authService.loginWithGoogle(credential).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.router.navigate(['/login-success'], {
          state: { email: res.user.email },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 403) {
          this.socialMessage.set('Account is inactive. Please contact support.');
        } else if (err.status === 409) {
          this.socialMessage.set(
            'This email is already associated with another Google account.'
          );
        } else {
          this.socialMessage.set(
            err.error?.detail || 'Google sign-in failed. Please try again.'
          );
        }
      },
    });
  }

  // APPLE - REMOVED FROM TEMPLATE PER SPEC (PRESERVED AS HELPER)
  continueWithApple(): void {
    this.socialMessage.set(
      'Apple Sign In is available in frontend demo mode only. Real authentication will be connected later.'
    );
  }

  // WHATSAPP - UI-ONLY COMING SOON PER SPEC
  continueWithWhatsApp(): void {
    this.socialMessage.set(
      'WhatsApp Sign In is coming soon. Please continue with Email or Google.'
    );
  }

  // CLOSE MODAL
  closeModal(): void {
    this.router.navigate(['/']);
  }

  // BACKDROP CLICK HANDLER
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement)?.classList.contains('auth-page')) {
      this.closeModal();
    }
  }
}
