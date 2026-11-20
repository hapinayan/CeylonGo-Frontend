import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderLoginPlaceholder } from './provider-login-placeholder';
import { ProviderOtpService } from '../../provider/registration/services/provider-otp.service';
import { ProviderRegistrationStateService } from '../../provider/registration/services/provider-registration-state.service';

describe('ProviderLoginPlaceholder Component', () => {
  let component: ProviderLoginPlaceholder;
  let fixture: ComponentFixture<ProviderLoginPlaceholder>;
  let router: Router;
  let otpServiceMock: {
    setupPassword: ReturnType<typeof vi.fn>;
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

    await TestBed.configureTestingModule({
      imports: [ProviderLoginPlaceholder],
      providers: [
        provideRouter([]),
        { provide: ProviderOtpService, useValue: otpServiceMock },
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

  it('should render standard provider login placeholder when action is not password_setup', async () => {
    await setupComponent({});
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.title')?.textContent).toContain('Service Provider Login');
    expect(compiled.querySelector('.info-box')).not.toBeNull();
    expect(compiled.querySelector('.setup-form')).toBeNull();
  });

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
