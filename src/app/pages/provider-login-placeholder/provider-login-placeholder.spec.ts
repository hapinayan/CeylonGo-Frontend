import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderLoginPlaceholder } from './provider-login-placeholder';
import { ProviderOtpService } from '../../provider/registration/services/provider-otp.service';
import { ProviderRegistrationStateService } from '../../provider/registration/services/provider-registration-state.service';
import { ProviderAuthService } from '../../core/services/provider-auth.service';

describe('ProviderLoginPlaceholder Component', () => {
  let component: ProviderLoginPlaceholder;
  let fixture: ComponentFixture<ProviderLoginPlaceholder>;
  let router: Router;
  let otpServiceMock: {
    setupPassword: ReturnType<typeof vi.fn>;
  };
  let providerAuthServiceMock: {
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    getToken: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    isApprovedProvider: ReturnType<typeof vi.fn>;
  };
  let stateService: ProviderRegistrationStateService;

  const setupComponent = async (
    queryParams: Record<string, string> = {},
    backendAuthorized = false,
    token = 'valid-test-token',
    email = 'provider@example.com'
  ) => {
    otpServiceMock = {
      setupPassword: vi.fn(),
    };

    providerAuthServiceMock = {
      login: vi.fn(),
      logout: vi.fn(),
      getToken: vi.fn(),
      getUser: vi.fn(),
      isAuthenticated: vi.fn(),
      isApprovedProvider: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderLoginPlaceholder],
      providers: [
        provideRouter([]),
        { provide: ProviderOtpService, useValue: otpServiceMock },
        { provide: ProviderAuthService, useValue: providerAuthServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParams[key] ?? null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
    stateService = TestBed.inject(ProviderRegistrationStateService);

    if (backendAuthorized) {
      stateService.setOtpVerified({
        verified: true,
        authorization_token: token,
        expires_in: 900,
        next_action: 'create_password',
      });
      stateService.setEmail(email);
    }

    fixture = TestBed.createComponent(ProviderLoginPlaceholder);
    component = fixture.componentInstance;
  };

  // =========================================================================
  // 1. NORMAL SERVICE PROVIDER LOGIN TESTS
  // =========================================================================
  describe('Normal Service Provider Login', () => {
    it('should render the approved login UI with Welcome Back, briefcase, badge, and navigation links', async () => {
      await setupComponent({});
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.badge')?.textContent).toContain('Provider Portal');
      expect(compiled.querySelector('.title')?.textContent).toContain('Welcome Back!');
      expect(compiled.querySelector('.subtitle')?.textContent).toContain(
        'Sign in to your CeylonGo provider account to manage your business'
      );
      expect(compiled.querySelector('.icon-bubble')).not.toBeNull();
      expect(compiled.querySelector('#provider-login-email')).not.toBeNull();
      expect(compiled.querySelector('#provider-login-password')).not.toBeNull();

      const forgotLink = compiled.querySelector('.forgot-link') as HTMLAnchorElement;
      expect(forgotLink).not.toBeNull();
      expect(forgotLink.getAttribute('href')).toBe('/provider/forgot-password');

      const registerBtn = compiled.querySelector('.btn-secondary-outline') as HTMLAnchorElement;
      expect(registerBtn).not.toBeNull();
      expect(registerBtn.getAttribute('href')).toBe('/provider/register');
      expect(registerBtn.textContent).toContain('Register New Business');
    });

    it('should validate form and disable Sign In button when email or password is missing/invalid', async () => {
      await setupComponent({});
      fixture.detectChanges();

      expect(component.isLoginFormValid()).toBe(false);

      const compiled = fixture.nativeElement as HTMLElement;
      const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      // Invalid email
      component.loginEmail.set('not-an-email');
      component.loginPassword.set('SomePassword123!');
      expect(component.isEmailFormatValid()).toBe(false);
      expect(component.isLoginFormValid()).toBe(false);

      // Valid email and password
      component.loginEmail.set('provider@example.com');
      component.loginPassword.set('SomePassword123!');
      expect(component.isEmailFormatValid()).toBe(true);
      expect(component.isLoginFormValid()).toBe(true);

      fixture.detectChanges();
      expect(submitBtn.disabled).toBe(false);
    });

    it('should toggle password visibility on eye button click', async () => {
      await setupComponent({});
      fixture.detectChanges();

      expect(component.showLoginPassword()).toBe(false);
      const compiled = fixture.nativeElement as HTMLElement;
      const pwdInput = compiled.querySelector('#provider-login-password') as HTMLInputElement;
      expect(pwdInput.type).toBe('password');

      const toggleBtn = compiled.querySelector('.btn-toggle-eye') as HTMLButtonElement;
      toggleBtn.click();
      fixture.detectChanges();

      expect(component.showLoginPassword()).toBe(true);
      expect(pwdInput.type).toBe('text');
    });

    it('should submit credentials and navigate to /provider/dashboard on login success', async () => {
      await setupComponent({});
      fixture.detectChanges();

      component.loginEmail.set('provider@example.com');
      component.loginPassword.set('ValidPassword123!');

      providerAuthServiceMock.login.mockReturnValue(
        of({
          access_token: 'valid-jwt',
          token_type: 'bearer',
          user: {
            id: 1,
            email: 'provider@example.com',
            full_name: 'Provider Name',
            role: 'provider',
            is_active: true,
            business_name: 'Ceylon Safari',
            provider_type: 'safari',
            district: 'Yala',
            approval_status: 'approved',
          },
        })
      );

      component.onSubmitLogin();
      fixture.detectChanges();

      expect(providerAuthServiceMock.login).toHaveBeenCalledWith({
        email: 'provider@example.com',
        password: 'ValidPassword123!',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/provider/dashboard']);
    });

    it('should display error message on 401 invalid credentials', async () => {
      await setupComponent({});
      fixture.detectChanges();

      component.loginEmail.set('provider@example.com');
      component.loginPassword.set('wrong-pwd');

      providerAuthServiceMock.login.mockReturnValue(
        throwError(() => ({
          status: 401,
          message: 'Invalid email or password. Please verify your credentials and try again.',
        }))
      );

      component.onSubmitLogin();
      fixture.detectChanges();

      expect(component.isLoginSubmitting()).toBe(false);
      expect(component.loginErrorMessage()).toContain('Invalid email or password');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-error')?.textContent).toContain(
        'Invalid email or password'
      );
    });

    it('should display error message when account is pending admin review or rejected (403)', async () => {
      await setupComponent({});
      fixture.detectChanges();

      component.loginEmail.set('pending@example.com');
      component.loginPassword.set('password');

      providerAuthServiceMock.login.mockReturnValue(
        throwError(() => ({
          status: 403,
          message: 'Provider application is pending admin review.',
        }))
      );

      component.onSubmitLogin();
      fixture.detectChanges();

      expect(component.loginErrorMessage()).toBe(
        'Provider application is pending admin review.'
      );

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.alert-error')?.textContent).toContain(
        'Provider application is pending admin review'
      );
    });

    it('should sync autofilled DOM values when inputs are populated without keyboard input events and enable Sign In button', async () => {
      await setupComponent({});
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#provider-login-email') as HTMLInputElement;
      const passwordInput = compiled.querySelector('#provider-login-password') as HTMLInputElement;
      const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;

      expect(submitBtn.disabled).toBe(true);

      // Simulate browser password manager populating DOM value silently
      emailInput.value = 'autofill@ceylongo.com';
      passwordInput.value = 'AutofillSecurePass123!';

      // Trigger autofill sync
      component.syncAutofillValues();
      fixture.detectChanges();

      expect(component.loginEmail()).toBe('autofill@ceylongo.com');
      expect(component.loginPassword()).toBe('AutofillSecurePass123!');
      expect(component.isLoginFormValid()).toBe(true);
      expect(submitBtn.disabled).toBe(false);
    });

    it('should submit form and call providerAuthService.login when autofilled credentials are submitted', async () => {
      await setupComponent({});
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#provider-login-email') as HTMLInputElement;
      const passwordInput = compiled.querySelector('#provider-login-password') as HTMLInputElement;

      emailInput.value = 'autofill@ceylongo.com';
      passwordInput.value = 'AutofillSecurePass123!';

      providerAuthServiceMock.login.mockReturnValue(
        of({
          access_token: 'autofill-jwt',
          token_type: 'bearer',
          user: {
            id: 2,
            email: 'autofill@ceylongo.com',
            full_name: 'Autofill Provider',
            role: 'provider',
            is_active: true,
            business_name: 'Autofill Business',
            provider_type: 'hotel',
            district: 'Galle',
            approval_status: 'approved',
          },
        })
      );

      // Form submit triggers onSubmitLogin with sync
      component.onSubmitLogin(new Event('submit'));
      fixture.detectChanges();

      expect(providerAuthServiceMock.login).toHaveBeenCalledWith({
        email: 'autofill@ceylongo.com',
        password: 'AutofillSecurePass123!',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/provider/dashboard']);
    });

    it('should prevent native HTML GET form submission and invoke preventDefault on submit event', async () => {
      await setupComponent({});
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const form = compiled.querySelector('form') as HTMLFormElement;

      expect(form.getAttribute('method')).toBe('POST');
      expect(form.getAttribute('action')).toBe('javascript:void(0);');

      const submitEvent = new Event('submit', { cancelable: true });
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should clear signal when input is cleared and never restore stale credentials', async () => {
      await setupComponent({});
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('#provider-login-email') as HTMLInputElement;

      // Populate input
      emailInput.value = 'initial@example.com';
      component.syncAutofillValues();
      expect(component.loginEmail()).toBe('initial@example.com');

      // User clears the field
      emailInput.value = '';
      emailInput.dispatchEvent(new Event('input'));
      component.syncAutofillValues();

      expect(component.loginEmail()).toBe('');
      expect(emailInput.value).toBe('');
    });

    it('should submit login on Enter key press in form inputs without exposing credentials in URL', async () => {
      await setupComponent({});
      fixture.detectChanges();

      component.loginEmail.set('enter@example.com');
      component.loginPassword.set('Password123!');
      fixture.detectChanges();

      providerAuthServiceMock.login.mockReturnValue(
        of({
          access_token: 'enter-jwt',
          token_type: 'bearer',
          user: {
            id: 3,
            email: 'enter@example.com',
            full_name: 'Enter Provider',
            role: 'provider',
            is_active: true,
            business_name: 'Enter Business',
            provider_type: 'hotel',
            district: 'Colombo',
            approval_status: 'approved',
          },
        })
      );

      const compiled = fixture.nativeElement as HTMLElement;
      const form = compiled.querySelector('form') as HTMLFormElement;

      const submitEvent = new Event('submit', { cancelable: true });
      const preventSpy = vi.spyOn(submitEvent, 'preventDefault');
      form.dispatchEvent(submitEvent);

      expect(preventSpy).toHaveBeenCalled();
      expect(providerAuthServiceMock.login).toHaveBeenCalledWith({
        email: 'enter@example.com',
        password: 'Password123!',
      });
      expect(providerAuthServiceMock.login).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/provider/dashboard']);
    });

    it('should scrub exposed credential query parameters from URL on init without reloading', async () => {
      await setupComponent({ email: 'exposed@example.com', password: 'ExposedPassword123!' });
      fixture.detectChanges();

      expect(component.loginEmail()).toBe('exposed@example.com');
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: expect.anything(),
        queryParams: {},
        replaceUrl: true,
      });
    });

    it('should generate exactly one login POST request when submitting valid credentials', async () => {
      await setupComponent({});
      fixture.detectChanges();

      component.loginEmail.set('single-post@example.com');
      component.loginPassword.set('SinglePostPass123!');
      fixture.detectChanges();

      providerAuthServiceMock.login.mockReturnValue(
        of({
          access_token: 'valid-jwt',
          token_type: 'bearer',
          user: {
            id: 5,
            email: 'single-post@example.com',
            full_name: 'Single Post',
            role: 'provider',
            is_active: true,
            business_name: 'Single Post Business',
            provider_type: 'hotel',
            district: 'Colombo',
            approval_status: 'approved',
          },
        })
      );

      const compiled = fixture.nativeElement as HTMLElement;
      const form = compiled.querySelector('form') as HTMLFormElement;

      // Dispatch form submission
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();

      expect(providerAuthServiceMock.login).toHaveBeenCalledTimes(1);
      expect(providerAuthServiceMock.login).toHaveBeenCalledWith({
        email: 'single-post@example.com',
        password: 'SinglePostPass123!',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/provider/dashboard']);
    });
  });

  // =========================================================================
  // 2. FIRST-TIME PASSWORD SETUP TESTS (PRESERVED)
  // =========================================================================
  describe('First-time Password Setup Mode', () => {
    it('should show error and block submission when action=password_setup but token is missing', async () => {
      await setupComponent({ action: 'password_setup' });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.title')?.textContent).toContain('Set Up Your Password');
      expect(component.isTokenMissingOrInvalid()).toBe(true);
      expect(compiled.querySelector('.alert-error')?.textContent).toContain('Password setup authorization token required');
      expect(compiled.querySelector('.setup-form')).toBeNull();
      expect(compiled.querySelector('.token-blocked-actions')).not.toBeNull();
    });

    it('should block setup and not display approval banner when action=password_setup has untrusted query token without backend confirmation', async () => {
      await setupComponent({ action: 'password_setup', token: 'untrusted-query-token', email: 'spoofed@example.com' });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(component.isApprovedVerified()).toBe(false);
      expect(component.isTokenMissingOrInvalid()).toBe(true);
      expect(compiled.querySelector('.approved-banner')).toBeNull();
      expect(compiled.querySelector('.setup-form')).toBeNull();
      expect(compiled.querySelector('.alert-error')?.textContent).toContain('Password setup authorization token required');
    });

    it('should display password setup form and approved banner when valid token is confirmed in stateService', async () => {
      await setupComponent({ action: 'password_setup' }, true, 'valid-auth-token', 'provider@example.com');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(component.token()).toBe('valid-auth-token');
      expect(component.email()).toBe('provider@example.com');
      expect(component.isApprovedVerified()).toBe(true);
      expect(compiled.querySelector('.approved-banner')?.textContent).toContain('Your business is approved');
      const emailInput = compiled.querySelector('#provider-email') as HTMLInputElement;
      expect(emailInput?.value).toBe('provider@example.com');
      expect(compiled.querySelector('.setup-form')).not.toBeNull();
    });

    it('should validate live password requirements correctly with 12 character minimum and 128 max', async () => {
      await setupComponent({ action: 'password_setup' }, true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.req-text')?.textContent).toContain('Minimum 12 characters');

      expect(component.hasMinLength()).toBe(false);
      expect(component.hasUppercase()).toBe(false);
      expect(component.hasLowercase()).toBe(false);
      expect(component.hasNumber()).toBe(false);
      expect(component.hasSpecialChar()).toBe(false);

      // 8 characters satisfies complexity but fails minimum length (12 required)
      component.password.set('Pass123!');
      expect(component.hasMinLength()).toBe(false);
      expect(component.hasUppercase()).toBe(true);
      expect(component.hasLowercase()).toBe(true);
      expect(component.hasNumber()).toBe(true);
      expect(component.hasSpecialChar()).toBe(true);

      // 11 characters fails minimum length
      component.password.set('ShortPass1!');
      expect(component.hasMinLength()).toBe(false);

      // 12 characters satisfies minimum length
      component.password.set('ShortPass12!');
      expect(component.hasMinLength()).toBe(true);
      expect(component.hasMaxLength()).toBe(true);
      expect(component.isExceedingMaxLength()).toBe(false);

      // 129 characters exceeds maximum length
      component.password.set('A'.repeat(128) + '1!a');
      expect(component.hasMaxLength()).toBe(false);
      expect(component.isExceedingMaxLength()).toBe(true);
      expect(component.isFormValid()).toBe(false);
    });

    it('should disable submit button when password does not meet 12 characters minimum', async () => {
      await setupComponent({ action: 'password_setup' }, true);
      fixture.detectChanges();

      component.password.set('Short123!');
      component.confirmPassword.set('Short123!');
      fixture.detectChanges();

      expect(component.hasMinLength()).toBe(false);
      expect(component.isFormValid()).toBe(false);

      const compiled = fixture.nativeElement as HTMLElement;
      const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    });

    it('should detect password mismatch and display inline error', async () => {
      await setupComponent({ action: 'password_setup' }, true);
      fixture.detectChanges();

      component.password.set('ValidStrongPassword123!');
      component.confirmPassword.set('DifferentPassword456!');
      fixture.detectChanges();

      expect(component.passwordsMatch()).toBe(false);
      expect(component.isFormValid()).toBe(false);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.field-error-msg')?.textContent).toContain('Passwords do not match');
    });

    it('should submit valid password (>= 12 chars) and transition to success state on 200 OK', async () => {
      await setupComponent({ action: 'password_setup' }, true, 'valid-test-token');
      fixture.detectChanges();

      component.password.set('ValidStrongPassword123!');
      component.confirmPassword.set('ValidStrongPassword123!');
      expect(component.isFormValid()).toBe(true);

      otpServiceMock.setupPassword.mockReturnValue(
        of({
          success: true,
          account_activated: true,
          next_action: 'provider_login',
          message: 'Your provider account is ready. Please sign in.',
        })
      );

      component.onSubmitPasswordSetup();
      fixture.detectChanges();

      expect(otpServiceMock.setupPassword).toHaveBeenCalledWith(
        {
          password: 'ValidStrongPassword123!',
          confirm_password: 'ValidStrongPassword123!',
        },
        'valid-test-token'
      );
      expect(component.isSuccess()).toBe(true);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.title')?.textContent).toContain('Password Created Successfully!');
      expect(compiled.querySelector('.subtitle')?.textContent).toContain('Your provider account is ready');
    });

    it('should display error message when backend returns an error', async () => {
      await setupComponent({ action: 'password_setup' }, true, 'valid-test-token');
      fixture.detectChanges();

      component.password.set('ValidStrongPassword123!');
      component.confirmPassword.set('ValidStrongPassword123!');

      otpServiceMock.setupPassword.mockReturnValue(
        throwError(() => ({
          status: 401,
          message: 'Password setup authorization token has expired. Please verify your email again.',
        }))
      );

      component.onSubmitPasswordSetup();
      fixture.detectChanges();

      expect(component.isSuccess()).toBe(false);
      expect(component.isTokenExpired()).toBe(true);
      expect(component.errorMessage()).toContain('expired');
    });

    it('should clear password setup mode and navigate to login when continueToLogin is clicked', async () => {
      await setupComponent({ action: 'password_setup' }, true, 'valid-test-token');
      fixture.detectChanges();

      component.continueToLogin();
      expect(router.navigate).toHaveBeenCalledWith(['/provider/login'], { queryParams: {} });
      expect(component.isPasswordSetup()).toBe(false);
    });
  });
});
