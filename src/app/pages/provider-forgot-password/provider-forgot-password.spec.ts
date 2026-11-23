import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { PROVIDER_RESET_EMAIL_KEY, ProviderForgotPassword } from './provider-forgot-password';

describe('ProviderForgotPassword Component', () => {
  let component: ProviderForgotPassword;
  let fixture: ComponentFixture<ProviderForgotPassword>;
  let router: Router;
  let authServiceMock: {
    forgotPassword: ReturnType<typeof vi.fn>;
  };

  const setupComponent = async (queryParams: Record<string, string> = {}) => {
    authServiceMock = {
      forgotPassword: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderForgotPassword],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
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

    fixture = TestBed.createComponent(ProviderForgotPassword);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROVIDER_RESET_EMAIL_KEY);
    }
  });

  it('should render the approved UI with Provider Portal badge, envelope icon bubble, title, info panel, and buttons', async () => {
    await setupComponent({});
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge')?.textContent).toContain('Provider Portal');
    expect(compiled.querySelector('.title')?.textContent).toContain('Forgot Your Password?');
    expect(compiled.querySelector('.subtitle')?.textContent).toContain(
      'Enter your registered email address and we\'ll send you a secure link to reset your password'
    );
    expect(compiled.querySelector('.icon-bubble')).not.toBeNull();
    expect(compiled.querySelector('#provider-forgot-email')).not.toBeNull();
    expect(compiled.querySelector('.info-panel')?.textContent).toContain('30 minutes');

    const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent).toContain('Send Reset Link');
    expect(submitBtn.disabled).toBe(true);

    const backBtn = compiled.querySelector('.btn-secondary-outline') as HTMLAnchorElement;
    expect(backBtn).not.toBeNull();
    expect(backBtn.getAttribute('href')).toBe('/provider/login');
    expect(backBtn.textContent).toContain('Back to Login');

    expect(compiled.querySelector('.card-footer')?.textContent).toContain(
      'Your information is protected and secure.'
    );
  });

  it('should prefill email when query param is present in URL', async () => {
    await setupComponent({ email: 'provider@ceylongo.com' });
    fixture.detectChanges();

    expect(component.forgotForm.value.email).toBe('provider@ceylongo.com');
    expect(component.forgotForm.valid).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });

  it('should validate email format and show error when touched and invalid', async () => {
    await setupComponent({});
    fixture.detectChanges();

    const emailCtrl = component.forgotForm.controls.email;
    emailCtrl.setValue('invalid-email-address');
    emailCtrl.markAsTouched();
    fixture.detectChanges();

    expect(emailCtrl.invalid).toBe(true);
    expect(component.forgotForm.invalid).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.field-error-msg')?.textContent).toContain(
      'Please enter a valid email address.'
    );

    const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('should submit valid email and switch to confirmation state, saving email in localStorage', async () => {
    await setupComponent({});
    fixture.detectChanges();

    component.forgotForm.controls.email.setValue('valid.provider@ceylongo.com');
    authServiceMock.forgotPassword.mockReturnValue(
      of({ message: 'If an account exists with this email, a password reset link has been sent.' })
    );

    component.onSubmit();
    fixture.detectChanges();

    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith('valid.provider@ceylongo.com');
    expect(component.isSubmitted()).toBe(true);
    expect(component.submittedEmail()).toBe('valid.provider@ceylongo.com');
    expect(localStorage.getItem(PROVIDER_RESET_EMAIL_KEY)).toBe('valid.provider@ceylongo.com');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.title')?.textContent).toContain('Check Your Email');
    expect(compiled.querySelector('.subtitle')?.textContent).toContain('valid.provider@ceylongo.com');
    expect(compiled.querySelector('.info-panel')?.textContent).toContain('30 minutes');
  });

  it('should handle rate limiting (429) and display clear error message', async () => {
    await setupComponent({});
    fixture.detectChanges();

    component.forgotForm.controls.email.setValue('spammer@ceylongo.com');
    authServiceMock.forgotPassword.mockReturnValue(
      throwError(() => ({ status: 429, message: 'Too Many Requests' }))
    );

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isSubmitted()).toBe(false);
    expect(component.errorMessage()).toContain('Too many password reset requests');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-error')?.textContent).toContain('Too many password reset requests');
  });

  it('should handle connection failure (status 0) and display server error message', async () => {
    await setupComponent({});
    fixture.detectChanges();

    component.forgotForm.controls.email.setValue('provider@ceylongo.com');
    authServiceMock.forgotPassword.mockReturnValue(
      throwError(() => ({ status: 0, message: 'Server Unreachable' }))
    );

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isSubmitted()).toBe(false);
    expect(component.errorMessage()).toContain('Cannot connect to server');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-error')?.textContent).toContain('Cannot connect to server');
  });

  it('should provide anti-enumeration protection and show confirmation for other errors', async () => {
    await setupComponent({});
    fixture.detectChanges();

    component.forgotForm.controls.email.setValue('unknown@ceylongo.com');
    authServiceMock.forgotPassword.mockReturnValue(
      throwError(() => ({ status: 404, message: 'Not found' }))
    );

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isSubmitted()).toBe(true);
    expect(component.submittedEmail()).toBe('unknown@ceylongo.com');
    expect(localStorage.getItem(PROVIDER_RESET_EMAIL_KEY)).toBe('unknown@ceylongo.com');
  });

  it('should allow resending link from confirmation view', async () => {
    await setupComponent({});
    component.submittedEmail.set('provider@ceylongo.com');
    component.isSubmitted.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const resendBtn = compiled.querySelector('.btn-text-link') as HTMLButtonElement;
    expect(resendBtn).not.toBeNull();

    resendBtn.click();
    fixture.detectChanges();

    expect(component.isSubmitted()).toBe(false);
    expect(compiled.querySelector('.title')?.textContent).toContain('Forgot Your Password?');
  });

  it('should navigate to provider login with email query param on backToLogin', async () => {
    await setupComponent({ email: 'provider@ceylongo.com' });
    fixture.detectChanges();

    component.backToLogin();
    expect(router.navigate).toHaveBeenCalledWith(['/provider/login'], {
      queryParams: { email: 'provider@ceylongo.com' },
    });
  });
});
