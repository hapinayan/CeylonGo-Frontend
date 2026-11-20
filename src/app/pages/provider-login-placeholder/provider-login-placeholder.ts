import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProviderOtpService, ProviderApiError } from '../../provider/registration/services/provider-otp.service';
import { ProviderRegistrationStateService } from '../../provider/registration/services/provider-registration-state.service';
import { ProviderPasswordSetupPayload } from '../../provider/registration/models/provider-otp.model';

@Component({
  selector: 'app-provider-login-placeholder',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './provider-login-placeholder.html',
  styleUrl: './provider-login-placeholder.scss'
})
export class ProviderLoginPlaceholder implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly providerOtpService = inject(ProviderOtpService);
  private readonly stateService = inject(ProviderRegistrationStateService);

  readonly isPasswordSetup = signal<boolean>(false);
  readonly email = signal<string>('');
  readonly token = signal<string | null>(null);
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isSuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isTokenMissingOrInvalid = signal<boolean>(false);
  readonly isTokenExpired = signal<boolean>(false);
  readonly isApprovedVerified = signal<boolean>(false);

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
      !!this.token() &&
      !this.isTokenExpired() &&
      !this.isTokenMissingOrInvalid() &&
      this.isApprovedVerified()
    );
  });

  ngOnInit(): void {
    const action = this.route.snapshot.queryParamMap.get('action');
    if (action === 'password_setup') {
      this.isPasswordSetup.set(true);

      const nav = this.router.getCurrentNavigation();
      const navState = nav?.extras?.state;
      const historyState = typeof history !== 'undefined' ? history.state : null;
      const stateToken = (navState && navState['token']) || (historyState && historyState['token']) || null;
      const stateEmail = (navState && navState['email']) || (historyState && historyState['email']) || null;

      // Trusted backend-confirmed authorization:
      // Must be confirmed by stateService (where OTP verification confirmed next_action === 'create_password')
      // or verified navigation state from the onboarding flow.
      const hasStateAuth =
        this.stateService.nextAction() === 'create_password' &&
        this.stateService.hasValidAuthorizationToken() &&
        !!this.stateService.email();

      const hasNavAuth =
        Boolean(navState?.['backendAuthorized'] || historyState?.['backendAuthorized']) &&
        (navState?.['nextAction'] === 'create_password' || historyState?.['nextAction'] === 'create_password') &&
        Boolean(stateToken) &&
        Boolean(stateEmail);

      const isBackendConfirmed = hasStateAuth || hasNavAuth;

      if (!isBackendConfirmed) {
        this.isApprovedVerified.set(false);
        this.isTokenMissingOrInvalid.set(true);
        this.errorMessage.set(
          'Password setup authorization token required. The action parameter alone does not grant access. Please complete email verification through the provider portal.'
        );
        return;
      }

      const trustedToken = (hasStateAuth ? this.stateService.getAuthorizationToken() : null) || stateToken;
      const trustedEmail = (hasStateAuth ? this.stateService.email() : null) || stateEmail || '';

      if (!trustedToken) {
        this.isApprovedVerified.set(false);
        this.isTokenMissingOrInvalid.set(true);
        this.errorMessage.set(
          'Password setup authorization token required. The action parameter alone does not grant access. Please complete email verification through the provider portal.'
        );
        return;
      }

      this.token.set(trustedToken);
      this.email.set(trustedEmail);

      // Verify token expiration if known from stateService or JWT payload
      if (hasStateAuth && !this.stateService.hasValidAuthorizationToken()) {
        this.isTokenExpired.set(true);
        this.isApprovedVerified.set(false);
        this.errorMessage.set(
          'Your password setup authorization token has expired. Please verify your email again.'
        );
        return;
      }

      try {
        const parts = trustedToken.split('.');
        if (parts.length === 3) {
          const payloadJson = JSON.parse(atob(parts[1]));
          if (payloadJson.exp && payloadJson.exp * 1000 < Date.now()) {
            this.isTokenExpired.set(true);
            this.isApprovedVerified.set(false);
            this.errorMessage.set(
              'Your password setup authorization token has expired. Please verify your email again.'
            );
            return;
          }
        }
      } catch {
        // Not a standard base64 JSON JWT or corrupted; backend will validate authorization
      }

      this.isApprovedVerified.set(true);
    }
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

  onSubmitPasswordSetup(): void {
    if (!this.isFormValid() || this.isSubmitting() || !this.token()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload: ProviderPasswordSetupPayload = {
      password: this.password(),
      confirm_password: this.confirmPassword(),
    };

    this.providerOtpService
      .setupPassword(payload, this.token()!)
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          if (response.success && response.account_activated) {
            this.isSuccess.set(true);
            this.stateService.clearAuthorization();
          } else {
            this.errorMessage.set(response.message || 'Password setup was not completed.');
          }
        },
        error: (error: ProviderApiError) => {
          this.isSubmitting.set(false);
          if (error.status === 401) {
            if (error.message.includes('expired')) {
              this.isTokenExpired.set(true);
            } else if (
              error.message.includes('already been used') ||
              error.message.includes('consumed') ||
              error.message.includes('revoked')
            ) {
              this.isTokenMissingOrInvalid.set(true);
            }
          }
          this.errorMessage.set(error.message);
        },
      });
  }

  continueToLogin(): void {
    this.isPasswordSetup.set(false);
    this.isSuccess.set(false);
    this.router.navigate(['/provider/login'], { queryParams: {} });
  }
}
