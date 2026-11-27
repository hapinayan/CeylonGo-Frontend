import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProviderOtpService, ProviderApiError } from '../../provider/registration/services/provider-otp.service';
import { FormsModule } from '@angular/forms';
import { ProviderRegistrationStateService } from '../../provider/registration/services/provider-registration-state.service';
import { ProviderPasswordSetupPayload } from '../../provider/registration/models/provider-otp.model';
import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderAuthError } from '../../core/models/provider-auth.models';

@Component({
  selector: 'app-provider-login-placeholder',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './provider-login-placeholder.html',
  styleUrl: './provider-login-placeholder.scss'
})
export class ProviderLoginPlaceholder implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('emailInput') emailInputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInputElement?: ElementRef<HTMLInputElement>;

  private autofillInterval?: ReturnType<typeof setInterval>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly providerOtpService = inject(ProviderOtpService);
  readonly passwordChanged = computed(() => this.route.snapshot.queryParamMap.get('passwordChanged') === 'true');
  private readonly stateService = inject(ProviderRegistrationStateService);
  private readonly providerAuthService = inject(ProviderAuthService);

  // Normal Login state
  readonly loginEmail = signal<string>('');
  readonly loginPassword = signal<string>('');
  readonly showLoginPassword = signal<boolean>(false);
  readonly isLoginSubmitting = signal<boolean>(false);
  readonly loginErrorMessage = signal<string | null>(null);

  readonly isEmailFormatValid = computed(() => {
    const em = this.loginEmail().trim();
    return !em || /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(em);
  });

  readonly isLoginFormValid = computed(() => {
    const em = this.loginEmail().trim();
    const pwd = this.loginPassword();
    return !!em && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(em) && !!pwd;
  });

  // Password Setup state
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
    } else {
      // Normal login: scrub any exposed credentials or leftover query parameters from URL
      const qp = this.route.snapshot.queryParamMap;
      const hasEmailParam = qp.has ? qp.has('email') : Boolean(qp.get('email'));
      const hasPasswordParam = qp.has ? qp.has('password') : Boolean(qp.get('password'));

      if (hasEmailParam || hasPasswordParam) {
        const emailVal = qp.get('email');
        if (emailVal && !this.loginEmail()) {
          this.loginEmail.set(emailVal);
        }
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
      }
    }
  }

  ngAfterViewInit(): void {
    this.syncAutofillValues();

    // Check periodically for the first 2 seconds to catch browser/extension autofill
    if (typeof window !== 'undefined') {
      let checks = 0;
      this.autofillInterval = setInterval(() => {
        this.syncAutofillValues();
        checks++;
        if (checks >= 20 || (this.loginEmail() && this.loginPassword())) {
          if (this.autofillInterval) {
            clearInterval(this.autofillInterval);
            this.autofillInterval = undefined;
          }
        }
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.autofillInterval) {
      clearInterval(this.autofillInterval);
      this.autofillInterval = undefined;
    }
  }

  syncAutofillValues(): void {
    let changed = false;
    if (this.emailInputElement?.nativeElement) {
      const domEmail = this.emailInputElement.nativeElement.value;
      if (domEmail && domEmail !== this.loginEmail()) {
        this.loginEmail.set(domEmail);
        changed = true;
      }
    }
    if (this.passwordInputElement?.nativeElement) {
      const domPassword = this.passwordInputElement.nativeElement.value;
      if (domPassword && domPassword !== this.loginPassword()) {
        this.loginPassword.set(domPassword);
        changed = true;
      }
    }
    if (changed && this.loginErrorMessage()) {
      this.loginErrorMessage.set(null);
    }
  }

  onAutofillDetected(event: AnimationEvent): void {
    if (event.animationName === 'onAutoFillStart' || event.animationName.includes('AutoFill')) {
      this.syncAutofillValues();
    }
  }

  onLoginEmailInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.loginEmail.set(target.value);
    this.loginErrorMessage.set(null);
  }

  onLoginPasswordInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.loginPassword.set(target.value);
    this.loginErrorMessage.set(null);
  }

  onSubmitLogin(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Always synchronize latest DOM inputs before checking validity
    this.syncAutofillValues();

    if (!this.isLoginFormValid() || this.isLoginSubmitting()) {
      return;
    }

    this.isLoginSubmitting.set(true);
    this.loginErrorMessage.set(null);

    this.providerAuthService
      .login({
        email: this.loginEmail().trim(),
        password: this.loginPassword(),
      })
      .subscribe({
        next: () => {
          this.isLoginSubmitting.set(false);
          void this.router.navigate(['/provider/dashboard']);
        },
        error: (error: ProviderAuthError) => {
          this.isLoginSubmitting.set(false);
          this.loginErrorMessage.set(error.message);
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

  onSubmitPasswordSetup(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

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
