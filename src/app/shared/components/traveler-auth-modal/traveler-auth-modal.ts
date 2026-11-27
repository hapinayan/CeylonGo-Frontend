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
  @ViewChild('otp0') otp0Input?: ElementRef<HTMLInputElement>;
  @ViewChild('otp1') otp1Input?: ElementRef<HTMLInputElement>;
  @ViewChild('otp2') otp2Input?: ElementRef<HTMLInputElement>;
  @ViewChild('otp3') otp3Input?: ElementRef<HTMLInputElement>;
  @ViewChild('otp4') otp4Input?: ElementRef<HTMLInputElement>;
  @ViewChild('otp5') otp5Input?: ElementRef<HTMLInputElement>;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // OTP Email Verification signals & state
  readonly otpDigits = signal<string[]>(['', '', '', '', '', '']);
  readonly resendOtpCooldown = signal(60);
  readonly otpExpiresIn = signal(300);
  readonly showRestartRegistration = signal(false);
  private otpCooldownInterval: any = null;
  private challengeExpirationInterval: any = null;

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
        } else if (step === 'verify-email') {
          setTimeout(() => this.getOtpInputElement(0)?.focus(), 150);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
    this.stopOtpCooldownTimer();
    this.stopChallengeExpirationTimer();
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
    this.stopOtpCooldownTimer();
    this.stopChallengeExpirationTimer();
    this.showRestartRegistration.set(false);
    this.authModalService.registrationId.set(null);
    this.authModalService.close();
  }

  onForgotPasswordClick(): void {
    const email = (this.authModalService.userEmail() || this.emailControl.value || '').trim().toLowerCase();
    this.close();
    if (email) {
      this.router.navigate(['/forgot-password'], {
        queryParams: { email },
      });
    } else {
      this.router.navigate(['/forgot-password']);
    }
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
    } else if (step === 'verify-email') {
      setTimeout(() => this.getOtpInputElement(0)?.focus(), 150);
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
    this.otpDigits.set(['', '', '', '', '', '']);
    this.showRestartRegistration.set(false);
    for (let i = 0; i < 6; i++) {
      const el = this.getOtpInputElement(i);
      if (el) el.value = '';
    }
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

        this.handleAuthenticationSuccess('Signed in successfully! Welcome back to CeylonGo.');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        const detail = (err.error?.detail || '').toString();
        if (err.status === 401) {
          this.errorMessage.set('Incorrect password. Please try again.');
        } else if (err.status === 403) {
          this.errorMessage.set(
            detail.toLowerCase().includes('inactive')
              ? 'Your account is inactive or suspended. Please contact CeylonGo support.'
              : detail || 'Your account is inactive or suspended. Please contact CeylonGo support.'
          );
        } else {
          this.errorMessage.set(detail || 'Authentication failed. Please check your credentials.');
        }
      },
    });
  }

  onRegisterSubmit(): void {
    this.errorMessage.set(null);
    this.showRestartRegistration.set(false);
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
      next: (response) => {
        this.isLoading.set(false);
        this.authModalService.registeredFullName.set(fullName);
        this.authModalService.registrationId.set(response.registration_id);
        this.authModalService.setStep('verify-email', email);

        const resendAfter = typeof response.resend_after === 'number' ? response.resend_after : 60;
        const expiresIn = typeof response.expires_in === 'number' ? response.expires_in : 300;

        this.otpExpiresIn.set(expiresIn);
        this.startOtpCooldown(resendAfter);
        this.startChallengeExpirationTimer(expiresIn);
        setTimeout(() => this.getOtpInputElement(0)?.focus(), 150);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.errorMessage.set('An account with this email address already exists. Please log in instead.');
        } else if (err.status === 422) {
          this.errorMessage.set('Please check your registration details (password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number).');
        } else if (err.status === 429) {
          const retryAfter = this.parseRetryAfter(err);
          this.errorMessage.set(`Too many registration attempts. Please wait ${retryAfter ? retryAfter + ' seconds' : 'a moment'} before trying again.`);
        } else if (err.status === 503) {
          this.errorMessage.set('Registration service is temporarily unavailable. Please try again shortly.');
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect to CeylonGo server. Please check your internet connection.');
        } else {
          this.errorMessage.set(err.error?.detail || 'Registration failed. Please check your details and try again.');
        }
      },
    });
  }

  // =========================================================================
  // EMAIL OTP VERIFICATION METHODS
  // =========================================================================

  private getOtpInputElement(index: number): HTMLInputElement | null {
    const inputs = [
      this.otp0Input,
      this.otp1Input,
      this.otp2Input,
      this.otp3Input,
      this.otp4Input,
      this.otp5Input,
    ];
    return inputs[index]?.nativeElement ?? null;
  }

  get isOtpComplete(): boolean {
    const digits = this.otpDigits();
    return digits.length === 6 && digits.every((d) => d.length === 1 && /^\d$/.test(d));
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value || '';
    const digitsOnly = raw.replace(/\D/g, '');

    if (digitsOnly.length > 1) {
      const current = [...this.otpDigits()];
      for (let i = 0; i < digitsOnly.length && index + i < 6; i++) {
        current[index + i] = digitsOnly[i];
        const el = this.getOtpInputElement(index + i);
        if (el) el.value = digitsOnly[i];
      }
      this.otpDigits.set(current);
      const nextIndex = Math.min(index + digitsOnly.length, 5);
      this.getOtpInputElement(nextIndex)?.focus();
      return;
    }

    const digit = digitsOnly.slice(-1);
    const current = [...this.otpDigits()];
    current[index] = digit;
    this.otpDigits.set(current);
    input.value = digit;

    if (digit && index < 5) {
      this.getOtpInputElement(index + 1)?.focus();
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const current = [...this.otpDigits()];
      if (!current[index] && index > 0) {
        event.preventDefault();
        current[index - 1] = '';
        this.otpDigits.set(current);
        const prev = this.getOtpInputElement(index - 1);
        if (prev) {
          prev.value = '';
          prev.focus();
        }
      } else if (current[index]) {
        current[index] = '';
        this.otpDigits.set(current);
        const el = this.getOtpInputElement(index);
        if (el) el.value = '';
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.getOtpInputElement(index - 1)?.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.getOtpInputElement(index + 1)?.focus();
    } else if (event.key === 'Enter') {
      if (this.isOtpComplete && !this.isLoading()) {
        this.onVerifyOtpSubmit();
      }
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const digits = pasted.replace(/\D/g, '').slice(0, 6);

    if (!digits) return;

    const current = ['', '', '', '', '', ''];
    for (let i = 0; i < digits.length; i++) {
      current[i] = digits[i];
      const el = this.getOtpInputElement(i);
      if (el) el.value = digits[i];
    }
    this.otpDigits.set(current);

    const targetIndex = Math.min(digits.length, 5);
    this.getOtpInputElement(targetIndex)?.focus();
  }

  onVerifyOtpSubmit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.isLoading() || !this.isOtpComplete) {
      return;
    }

    const email = this.authModalService.userEmail().trim().toLowerCase();
    const registrationId = this.authModalService.registrationId() || '';
    const otp = this.otpDigits().join('');

    if (!registrationId) {
      this.errorMessage.set('Registration session expired or missing. Please restart registration.');
      this.showRestartRegistration.set(true);
      return;
    }

    this.isLoading.set(true);

    this.authService.verifyEmail({ email, registration_id: registrationId, otp }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.stopOtpCooldownTimer();
        this.stopChallengeExpirationTimer();
        this.authModalService.registrationId.set(null);
        this.showRestartRegistration.set(false);
        this.authModalService.setStep('register-success');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        const detail = (err.error?.detail || '').toString();
        const detailLower = detail.toLowerCase();

        if (err.status === 400 || err.status === 404 || err.status === 410) {
          if (
            detailLower.includes('expired') ||
            detailLower.includes('locked') ||
            detailLower.includes('not found') ||
            detailLower.includes('challenge') ||
            detailLower.includes('restart') ||
            detailLower.includes('consumed')
          ) {
            this.errorMessage.set(detail || 'Verification session has expired or is invalid. Please restart registration.');
            this.showRestartRegistration.set(true);
            return;
          }
          this.errorMessage.set(detail || 'Invalid or expired verification code. Please check and try again.');
        } else if (err.status === 409) {
          this.errorMessage.set('This email address is already verified. You can now log in.');
          setTimeout(() => this.goToStep('login'), 1500);
        } else if (err.status === 422) {
          this.errorMessage.set('Invalid verification code format. Please enter all 6 numeric digits.');
        } else if (err.status === 429) {
          const retryAfter = this.parseRetryAfter(err);
          if (retryAfter) {
            this.startOtpCooldown(retryAfter);
          }
          this.errorMessage.set(`Too many verification attempts. Please wait ${retryAfter ? retryAfter + 's' : 'a moment'} before trying again.`);
        } else if (err.status === 503) {
          this.errorMessage.set('Verification service is temporarily unavailable. Please try again shortly.');
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect to CeylonGo server. Please check your internet connection.');
        } else {
          this.errorMessage.set(detail || 'Verification failed. Please check the code and try again.');
        }
      },
    });
  }

  onResendOtp(): void {
    if (this.isLoading() || this.resendOtpCooldown() > 0) {
      return;
    }

    const email = this.authModalService.userEmail().trim().toLowerCase();
    const registrationId = this.authModalService.registrationId() || '';

    if (!registrationId) {
      this.errorMessage.set('Registration session not found. Please restart registration.');
      this.showRestartRegistration.set(true);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.resendEmailOtp({ email, registration_id: registrationId }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        // Update stored registration_id from every successful resend response:
        if (response.registration_id) {
          this.authModalService.registrationId.set(response.registration_id);
        }
        const resendAfter = typeof response.resend_after === 'number' ? response.resend_after : 60;
        const expiresIn = typeof response.expires_in === 'number' ? response.expires_in : 300;

        this.otpExpiresIn.set(expiresIn);
        this.startOtpCooldown(resendAfter);
        this.startChallengeExpirationTimer(expiresIn);
        this.successMessage.set('A new verification code has been sent to your email.');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        const detail = (err.error?.detail || '').toString();
        const detailLower = detail.toLowerCase();

        if (err.status === 429) {
          const retryAfter = this.parseRetryAfter(err);
          if (retryAfter) {
            this.startOtpCooldown(retryAfter);
          }
          this.errorMessage.set(`Too many requests. Please wait ${retryAfter ? retryAfter + 's' : 'before requesting another code'}.`);
        } else if (err.status === 400 || err.status === 404 || err.status === 410) {
          if (
            detailLower.includes('expired') ||
            detailLower.includes('not found') ||
            detailLower.includes('challenge') ||
            detailLower.includes('locked')
          ) {
            this.errorMessage.set('Verification session has expired. Please restart registration.');
            this.showRestartRegistration.set(true);
            return;
          }
          this.errorMessage.set(detail || 'Unable to resend verification code. Please try again.');
        } else if (err.status === 503) {
          this.errorMessage.set('Service temporarily unavailable. Please try again shortly.');
        } else {
          this.errorMessage.set(detail || 'Unable to resend verification code. Please try again.');
        }
      },
    });
  }

  startOtpCooldown(seconds: number = 60): void {
    this.stopOtpCooldownTimer();
    this.resendOtpCooldown.set(seconds);
    this.otpCooldownInterval = setInterval(() => {
      const current = this.resendOtpCooldown();
      if (current <= 1) {
        this.resendOtpCooldown.set(0);
        this.stopOtpCooldownTimer();
      } else {
        this.resendOtpCooldown.set(current - 1);
      }
    }, 1000);
  }

  private stopOtpCooldownTimer(): void {
    if (this.otpCooldownInterval) {
      clearInterval(this.otpCooldownInterval);
      this.otpCooldownInterval = null;
    }
  }

  startChallengeExpirationTimer(seconds: number = 300): void {
    this.stopChallengeExpirationTimer();
    this.otpExpiresIn.set(seconds);
    this.challengeExpirationInterval = setInterval(() => {
      const current = this.otpExpiresIn();
      if (current <= 1) {
        this.otpExpiresIn.set(0);
        this.stopChallengeExpirationTimer();
        this.errorMessage.set('Verification code has expired. Please request a new code or restart registration.');
        this.showRestartRegistration.set(true);
      } else {
        this.otpExpiresIn.set(current - 1);
      }
    }, 1000);
  }

  private stopChallengeExpirationTimer(): void {
    if (this.challengeExpirationInterval) {
      clearInterval(this.challengeExpirationInterval);
      this.challengeExpirationInterval = null;
    }
  }

  private parseRetryAfter(err: HttpErrorResponse): number | null {
    try {
      const header = err.headers?.get('Retry-After');
      if (header) {
        const parsed = parseInt(header, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  restartRegistration(): void {
    this.authModalService.registrationId.set(null);
    this.showRestartRegistration.set(false);
    this.clearSensitiveFormState();
    this.stopOtpCooldownTimer();
    this.stopChallengeExpirationTimer();
    this.goToStep('register');
  }

  onChangeEmail(): void {
    this.authModalService.registrationId.set(null);
    this.showRestartRegistration.set(false);
    this.clearSensitiveFormState();
    this.stopOtpCooldownTimer();
    this.stopChallengeExpirationTimer();
    this.goToStep('entry');
  }

  onContinueToLoginAfterVerification(): void {
    const email = this.authModalService.userEmail();
    this.goToStep('login');
    if (email) {
      this.authModalService.userEmail.set(email);
    }
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
        this.handleAuthenticationSuccess('Signed in with Google! Welcome to CeylonGo.');
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

  private handleAuthenticationSuccess(successText: string): void {
    this.isLoading.set(false);
    this.successMessage.set(successText);
    setTimeout(() => {
      const pendingAction = this.authModalService.consumePendingAction();
      this.close();

      if (pendingAction) {
        if (pendingAction.resumeCallback) {
          try {
            pendingAction.resumeCallback();
          } catch (err) {
            console.error('Error executing pending auth action callback:', err);
          }
        } else if (pendingAction.route && this.isSafeInternalRoute(pendingAction.route)) {
          this.router.navigate([pendingAction.route], { queryParams: pendingAction.queryParams });
        }
      } else {
        const currentUrl = this.router.url;
        if (
          currentUrl.includes('/login') ||
          currentUrl.includes('/register') ||
          currentUrl.includes('/auth') ||
          currentUrl.includes('/traveler/home')
        ) {
          this.router.navigate(['/']);
        }
      }
    }, 500);
  }

  private isSafeInternalRoute(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes(':');
  }
}
