import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  ViewChild,
  effect,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthModalService, AuthModalStep } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

export interface CountryCodeOption {
  code: string;
  name: string;
  flag: string;
}

/**
 * Custom validator to verify password and confirm password matching.
 */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value || control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value || control.get('confirmNewPassword')?.value;
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-traveler-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './traveler-auth-modal.html',
  styleUrls: ['./traveler-auth-modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelerAuthModal implements OnDestroy {
  readonly authModalService = inject(AuthModalService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  @ViewChild('emailInput') emailInputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('loginPasswordInput') loginPasswordInputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('registerFullNameInput') registerFullNameInputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('resetNewPasswordInput') resetNewPasswordInputElement?: ElementRef<HTMLInputElement>;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Independent Show/Hide password toggles
  readonly isLoginPasswordVisible = signal(false);
  readonly isRegisterPasswordVisible = signal(false);
  readonly isRegisterConfirmPasswordVisible = signal(false);
  readonly isNewPasswordVisible = signal(false);
  readonly isConfirmNewPasswordVisible = signal(false);

  // Password recovery signals & state
  readonly isVerifyingToken = signal(false);
  readonly isTokenValid = signal(false);
  readonly tokenError = signal<string | null>(null);
  readonly resendCooldown = signal(0);
  private memoryResetToken: string | null = null;
  private resendIntervalId: any = null;

  readonly phoneBackendNotice = signal<string | null>(null);

  readonly countryCodes: readonly CountryCodeOption[] = [
    { code: '+94', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+1', name: 'United States / Canada', flag: '🇺🇸' },
    { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
    { code: '+91', name: 'India', flag: '🇮🇳' },
    { code: '+61', name: 'Australia', flag: '🇦🇺' },
    { code: '+49', name: 'Germany', flag: '🇩🇪' },
    { code: '+33', name: 'France', flag: '🇫🇷' },
  ];

  readonly emailForm = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
  });

  readonly loginForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly registerForm = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  readonly resetPasswordForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  readonly phoneForm = this.fb.group({
    countryCode: ['+94', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9\s-]{6,15}$/)]],
  });

  private wasOpen = false;

  constructor() {
    // Focus management and token initialization when modal opens or step changes
    effect(() => {
      const open = this.authModalService.isOpen();
      const step = this.authModalService.currentStep();
      const serviceToken = this.authModalService.resetToken();

      if (open && !this.wasOpen) {
        this.clearSensitiveFormState();
      }
      this.wasOpen = open;

      if (open) {
        if (step === 'reset-password' && serviceToken) {
          this.verifyToken(serviceToken);
          this.authModalService.setResetToken(null);
        }

        if (step === 'entry') {
          setTimeout(() => {
            if (this.authModalService.userEmail()) {
              this.emailControl.setValue(this.authModalService.userEmail());
            }
            this.emailInputElement?.nativeElement?.focus();
          }, 100);
        } else if (step === 'login') {
          setTimeout(() => this.loginPasswordInputElement?.nativeElement?.focus(), 100);
        } else if (step === 'register') {
          setTimeout(() => this.registerFullNameInputElement?.nativeElement?.focus(), 100);
        } else if (step === 'reset-password') {
          setTimeout(() => this.resetNewPasswordInputElement?.nativeElement?.focus(), 100);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
  }

  get emailControl() {
    return this.emailForm.controls.email;
  }

  get loginPasswordControl() {
    return this.loginForm.controls.password;
  }

  get registerFullNameControl() {
    return this.registerForm.controls.fullName;
  }

  get registerPasswordControl() {
    return this.registerForm.controls.password;
  }

  get registerConfirmPasswordControl() {
    return this.registerForm.controls.confirmPassword;
  }

  get resetNewPasswordControl() {
    return this.resetPasswordForm.controls.newPassword;
  }

  get resetConfirmNewPasswordControl() {
    return this.resetPasswordForm.controls.confirmNewPassword;
  }

  get phoneNumberControl() {
    return this.phoneForm.controls.phoneNumber;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.authModalService.isOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('auth-modal-backdrop')) {
      this.close();
    }
  }

  close(): void {
    this.clearSensitiveFormState();
    this.memoryResetToken = null;
    this.stopCooldownTimer();
    this.authModalService.close();
  }

  goToStep(step: AuthModalStep): void {
    this.clearSensitiveFormState();
    this.authModalService.setStep(step);

    if (step === 'entry') {
      if (this.authModalService.userEmail()) {
        this.emailControl.setValue(this.authModalService.userEmail());
      }
      setTimeout(() => this.emailInputElement?.nativeElement?.focus(), 100);
    } else if (step === 'login') {
      setTimeout(() => this.loginPasswordInputElement?.nativeElement?.focus(), 100);
    } else if (step === 'register') {
      setTimeout(() => this.registerFullNameInputElement?.nativeElement?.focus(), 100);
    } else if (step === 'reset-password') {
      setTimeout(() => this.resetNewPasswordInputElement?.nativeElement?.focus(), 100);
    }
  }

  private clearSensitiveFormState(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(false);
    this.phoneBackendNotice.set(null);
    this.loginForm.reset();
    this.registerForm.reset();
    this.resetPasswordForm.reset();
    this.isLoginPasswordVisible.set(false);
    this.isRegisterPasswordVisible.set(false);
    this.isRegisterConfirmPasswordVisible.set(false);
    this.isNewPasswordVisible.set(false);
    this.isConfirmNewPasswordVisible.set(false);
  }

  toggleLoginPasswordVisibility(): void {
    this.isLoginPasswordVisible.update((v) => !v);
  }

  toggleRegisterPasswordVisibility(): void {
    this.isRegisterPasswordVisible.update((v) => !v);
  }

  toggleRegisterConfirmPasswordVisibility(): void {
    this.isRegisterConfirmPasswordVisible.update((v) => !v);
  }

  toggleNewPasswordVisibility(): void {
    this.isNewPasswordVisible.update((v) => !v);
  }

  toggleConfirmNewPasswordVisibility(): void {
    this.isConfirmNewPasswordVisible.update((v) => !v);
  }

  onContinueWithEmail(): void {
    this.errorMessage.set(null);

    if (this.isLoading()) {
      return;
    }

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const email = (this.emailControl.value ?? '').trim().toLowerCase();
    this.isLoading.set(true);

    this.authService.checkEmail(email).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.is_registered) {
          this.authModalService.setStep('login', email);
          setTimeout(() => this.loginPasswordInputElement?.nativeElement?.focus(), 100);
        } else {
          this.authModalService.setStep('register', email);
          setTimeout(() => this.registerFullNameInputElement?.nativeElement?.focus(), 100);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 429) {
          this.errorMessage.set('Too many requests. Please wait a moment and try again.');
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect to CeylonGo server. Please check your internet connection.');
        } else {
          this.errorMessage.set(
            err.error?.detail || 'An unexpected error occurred while verifying your email. Please try again.'
          );
        }
      },
    });
  }

  onLoginSubmit(): void {
    this.errorMessage.set(null);
    if (this.isLoading()) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = this.authModalService.userEmail().trim().toLowerCase();
    const password = this.loginPasswordControl.value ?? '';

    this.isLoading.set(true);
    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        if (response.user.role !== 'traveler') {
          this.isLoading.set(false);
          this.authService.logout();
          const portal = response.user.role === 'provider' ? 'Provider Portal' : 'Admin Portal';
          this.errorMessage.set(
            `This account is registered as a ${response.user.role}. Please log in through the ${portal}.`
          );
          return;
        }

        this.isLoading.set(false);
        this.successMessage.set('Signed in successfully! Welcome back to CeylonGo.');
        setTimeout(() => {
          this.close();
          this.router.navigate(['/traveler/home']);
        }, 500);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Incorrect password. Please try again.');
        } else if (err.status === 403) {
          this.errorMessage.set('Your account is inactive or suspended. Please contact CeylonGo support.');
        } else {
          this.errorMessage.set(err.error?.detail || 'Authentication failed. Please check your credentials.');
        }
      },
    });
  }

  onRegisterSubmit(): void {
    this.errorMessage.set(null);
    if (this.isLoading()) {
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const email = this.authModalService.userEmail().trim().toLowerCase();
    const fullName = (this.registerFullNameControl.value ?? '').trim();
    const password = this.registerPasswordControl.value ?? '';

    this.isLoading.set(true);
    this.authService.register({ full_name: fullName, email, password }).subscribe({
      next: () => {
        this.authService.login({ email, password }).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.successMessage.set('Account created successfully! Welcome to CeylonGo.');
            setTimeout(() => {
              this.close();
              this.router.navigate(['/traveler/home']);
            }, 500);
          },
          error: () => {
            this.isLoading.set(false);
            this.goToStep('login');
            this.successMessage.set('Account created successfully! Please log in with your password.');
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('An account with this email address already exists. Please log in instead.');
        } else {
          this.errorMessage.set(err.error?.detail || 'Registration failed. Please check your details and try again.');
        }
      },
    });
  }

  // =========================================================================
  // PASSWORD RECOVERY METHODS
  // =========================================================================

  onForgotPasswordSubmit(): void {
    this.errorMessage.set(null);
    if (this.isLoading()) {
      return;
    }

    const email = this.authModalService.userEmail().trim().toLowerCase();
    if (!email) {
      this.goToStep('entry');
      return;
    }

    this.isLoading.set(true);
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.goToStep('check-email');
        this.startCooldownTimer(60);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 429) {
          this.errorMessage.set('Too many requests. Please wait a moment before trying again.');
        } else {
          this.errorMessage.set(
            err.error?.detail || 'Unable to send password reset link. Please check your connection and try again.'
          );
        }
      },
    });
  }

  onResendResetEmail(): void {
    if (this.isLoading() || this.resendCooldown() > 0) {
      return;
    }

    const email = this.authModalService.userEmail().trim().toLowerCase();
    if (!email) {
      this.goToStep('forgot-password');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.startCooldownTimer(60);
        this.successMessage.set('A new reset link has been sent to your email.');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 429) {
          this.errorMessage.set('Too many requests. Please wait a moment before trying again.');
        } else {
          this.errorMessage.set(
            err.error?.detail || 'Failed to resend reset link. Please try again later.'
          );
        }
      },
    });
  }

  verifyToken(token: string): void {
    const cleanToken = token.trim();
    if (!cleanToken) {
      this.isVerifyingToken.set(false);
      this.isTokenValid.set(false);
      this.tokenError.set('This password reset link is invalid or has expired. Please request a new link.');
      return;
    }

    this.isVerifyingToken.set(true);
    this.tokenError.set(null);
    this.isTokenValid.set(false);

    this.authService.verifyResetToken(cleanToken).subscribe({
      next: (response) => {
        this.isVerifyingToken.set(false);
        this.isTokenValid.set(true);
        this.memoryResetToken = cleanToken;
        if (response.email) {
          this.authModalService.userEmail.set(response.email);
        }
        setTimeout(() => this.resetNewPasswordInputElement?.nativeElement?.focus(), 100);
      },
      error: (err: HttpErrorResponse) => {
        this.isVerifyingToken.set(false);
        this.isTokenValid.set(false);
        this.memoryResetToken = null;
        if (err.status === 400 || err.status === 404) {
          this.tokenError.set('This password reset link is invalid, expired, or has already been used.');
        } else {
          this.tokenError.set(
            err.error?.detail || 'Unable to verify reset token. Please check your connection or request a new link.'
          );
        }
      },
    });
  }

  onResetPasswordSubmit(): void {
    this.errorMessage.set(null);
    if (this.isLoading() || !this.isTokenValid() || !this.memoryResetToken) {
      return;
    }

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.resetNewPasswordControl.value ?? '';
    const token = this.memoryResetToken;

    this.isLoading.set(true);
    this.authService.resetPassword({ token, new_password: newPassword }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.memoryResetToken = null;
        this.resetPasswordForm.reset();
        this.authService.logout();
        this.goToStep('reset-success');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 400) {
          this.errorMessage.set('This reset link has expired or has already been used. Please request a new one.');
        } else {
          this.errorMessage.set(
            err.error?.detail || 'Failed to update password. Please check requirements and try again.'
          );
        }
      },
    });
  }

  onBackToLoginFromSuccess(): void {
    const email = this.authModalService.userEmail();
    this.goToStep('login');
    if (email) {
      this.authModalService.userEmail.set(email);
    }
  }

  private startCooldownTimer(seconds: number): void {
    this.stopCooldownTimer();
    this.resendCooldown.set(seconds);
    this.resendIntervalId = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        this.stopCooldownTimer();
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  private stopCooldownTimer(): void {
    if (this.resendIntervalId) {
      clearInterval(this.resendIntervalId);
      this.resendIntervalId = null;
    }
  }

  onContinueWithGoogle(): void {
    this.errorMessage.set(null);
    if (typeof window === 'undefined') {
      return;
    }

    const googleObj = (window as unknown as { google?: any })?.google;
    if (environment.googleClientId && googleObj?.accounts?.id) {
      googleObj.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp: any) => {
          if (resp?.credential) {
            this.handleGoogleCredential(resp.credential);
          }
        },
      });
      googleObj.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          this.errorMessage.set('Google sign-in was closed or blocked by browser settings.');
        }
      });
    } else {
      this.errorMessage.set(
        'Google Sign-In integration is active. (Client ID configured in environment).'
      );
    }
  }

  handleGoogleCredential(credential: string): void {
    this.isLoading.set(true);
    this.authService.loginWithGoogle(credential).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Signed in with Google! Welcome to CeylonGo.');
        setTimeout(() => {
          this.close();
          this.router.navigate(['/traveler/home']);
        }, 500);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Google authentication failed.');
      },
    });
  }

  onContinueWithPhone(): void {
    this.goToStep('phone');
    this.phoneBackendNotice.set(
      'Traveler Phone SMS OTP service is currently in backend queue. CeylonGo presently authenticates via verified email and Google OAuth.'
    );
  }

  onPhoneSubmit(): void {
    this.phoneBackendNotice.set(
      'Notice: Traveler Phone SMS OTP API endpoint is not yet enabled on the CeylonGo backend. Please sign in using your verified email or Google account.'
    );
  }
}
