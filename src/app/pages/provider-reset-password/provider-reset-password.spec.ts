import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { PROVIDER_RESET_EMAIL_KEY } from '../provider-forgot-password/provider-forgot-password';
import { ProviderResetPassword } from './provider-reset-password';

describe('ProviderResetPassword Component', () => {
  let component: ProviderResetPassword;
  let fixture: ComponentFixture<ProviderResetPassword>;
  let router: Router;
  let authServiceMock: {
    verifyResetToken: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROVIDER_RESET_EMAIL_KEY);
    }

    authServiceMock = {
      verifyResetToken: vi.fn().mockReturnValue(
        of({ valid: true, email: 'provider@ceylongo.com', message: 'Token verified' })
      ),
      resetPassword: vi.fn().mockReturnValue(
        of({ message: 'Password has been reset successfully.' })
      ),
    };
  });

  const setupComponent = async (queryParams: Record<string, string> = {}) => {
    await TestBed.configureTestingModule({
      imports: [ProviderResetPassword],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParams[key] ?? null,
                has: (key: string) => key in queryParams,
              },
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));

    fixture = TestBed.createComponent(ProviderResetPassword);
    component = fixture.componentInstance;
  };

  it('should show error and blocked actions when token is missing', async () => {
    await setupComponent({});
    fixture.detectChanges();

    expect(component.isTokenValid()).toBe(false);
    expect(component.isVerifying()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-error')?.textContent).toContain(
      'This password reset link is invalid or has expired'
    );
    expect(compiled.querySelector('.invalid-token-actions')).not.toBeNull();
  });

  it('should strip token from URL immediately on init to avoid exposing sensitive tokens', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      of({ valid: true, email: 'provider@ceylongo.com', message: 'Token verified' })
    );

    await setupComponent({ token: 'secret-reset-token-123' });
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { token: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('should call verifyResetToken and show form when token is valid', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      of({ valid: true, email: 'verified.provider@ceylongo.com', message: 'Token verified' })
    );

    await setupComponent({ token: 'valid-token' });
    fixture.detectChanges();

    expect(authServiceMock.verifyResetToken).toHaveBeenCalledWith('valid-token');
    expect(component.isTokenValid()).toBe(true);
    expect(component.email()).toBe('verified.provider@ceylongo.com');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#provider-reset-email')).not.toBeNull();
    expect(compiled.querySelector('#provider-new-password')).not.toBeNull();
    expect(compiled.querySelector('#provider-confirm-password')).not.toBeNull();
    expect(compiled.querySelector('.requirements-box')).not.toBeNull();
  });

  it('should show error state when token verification fails', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { detail: 'Token has expired or is invalid.' },
      }))
    );

    await setupComponent({ token: 'expired-token' });
    fixture.detectChanges();

    expect(component.isTokenValid()).toBe(false);
    expect(component.errorMessage()).toContain('Token has expired or is invalid.');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-error')?.textContent).toContain('Token has expired');
    expect(compiled.querySelector('.invalid-token-actions')).not.toBeNull();
  });

  it('should enforce provider password complexity requirements (minimum 12 chars)', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      of({ valid: true, email: 'provider@ceylongo.com', message: 'Token verified' })
    );

    await setupComponent({ token: 'valid-token' });
    fixture.detectChanges();

    // 8 chars (fails 12 chars requirement)
    component.password.set('Pass123!');
    expect(component.hasMinLength()).toBe(false);
    expect(component.hasUppercase()).toBe(true);
    expect(component.hasLowercase()).toBe(true);
    expect(component.hasNumber()).toBe(true);
    expect(component.hasSpecialChar()).toBe(true);
    expect(component.isFormValid()).toBe(false);

    // 12 chars (satisfies requirements)
    component.password.set('ValidPass123!');
    component.confirmPassword.set('ValidPass123!');
    expect(component.hasMinLength()).toBe(true);
    expect(component.passwordsMatch()).toBe(true);
    expect(component.isFormValid()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    fixture.detectChanges();
    expect(submitBtn.disabled).toBe(false);
  });

  it('should detect password mismatch and disable submit button', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      of({ valid: true, email: 'provider@ceylongo.com', message: 'Token verified' })
    );

    await setupComponent({ token: 'valid-token' });
    fixture.detectChanges();

    component.password.set('ValidPass123!');
    component.confirmPassword.set('DifferentPass123!');
    fixture.detectChanges();

    expect(component.passwordsMatch()).toBe(false);
    expect(component.isFormValid()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.field-error-msg')?.textContent).toContain('Passwords do not match');

    const submitBtn = compiled.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('should toggle password visibility on eye button clicks', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      of({ valid: true, email: 'provider@ceylongo.com', message: 'Token verified' })
    );

    await setupComponent({ token: 'valid-token' });
    fixture.detectChanges();

    expect(component.showPassword()).toBe(false);
    expect(component.showConfirmPassword()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    const eyeBtns = compiled.querySelectorAll('.btn-toggle-eye');
    expect(eyeBtns.length).toBe(2);

    (eyeBtns[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.showPassword()).toBe(true);

    (eyeBtns[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.showConfirmPassword()).toBe(true);
  });

  it('should submit new password and switch to success state on successful reset', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      of({ valid: true, email: 'provider@ceylongo.com', message: 'Token verified' })
    );
    authServiceMock.resetPassword.mockReturnValue(
      of({ message: 'Password has been reset successfully.' })
    );

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROVIDER_RESET_EMAIL_KEY, 'provider@ceylongo.com');
    }

    await setupComponent({ token: 'valid-token' });
    fixture.detectChanges();

    component.password.set('SuperSecureProviderPass123!');
    component.confirmPassword.set('SuperSecureProviderPass123!');
    fixture.detectChanges();

    component.onSubmit();
    fixture.detectChanges();

    expect(authServiceMock.resetPassword).toHaveBeenCalledWith({
      token: 'valid-token',
      new_password: 'SuperSecureProviderPass123!',
    });
    expect(component.isSuccess()).toBe(true);
    expect(localStorage.getItem(PROVIDER_RESET_EMAIL_KEY)).toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.title')?.textContent).toContain('Password Reset Successfully!');
    expect(compiled.querySelector('a[href="/provider/login"]')).not.toBeNull();
  });

  it('should display error message when resetPassword returns an error', async () => {
    authServiceMock.verifyResetToken.mockReturnValue(
      of({ valid: true, email: 'provider@ceylongo.com', message: 'Token verified' })
    );
    authServiceMock.resetPassword.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { detail: 'Token has already been consumed.' },
      }))
    );

    await setupComponent({ token: 'valid-token' });
    fixture.detectChanges();

    component.password.set('SuperSecureProviderPass123!');
    component.confirmPassword.set('SuperSecureProviderPass123!');

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isSuccess()).toBe(false);
    expect(component.errorMessage()).toContain('already been consumed');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.alert-error')?.textContent).toContain('already been consumed');
  });
});
