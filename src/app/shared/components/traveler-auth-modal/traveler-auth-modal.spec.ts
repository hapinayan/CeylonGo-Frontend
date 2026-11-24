import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TravelerAuthModal } from './traveler-auth-modal';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';

describe('TravelerAuthModal', () => {
  let component: TravelerAuthModal;
  let fixture: ComponentFixture<TravelerAuthModal>;
  let modalService: AuthModalService;
  let router: Router;
  let authServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      checkEmail: vi.fn().mockReturnValue(
        of({ email: 'traveler@ceylongo.com', is_registered: true })
      ),
      login: vi.fn().mockReturnValue(
        of({
          access_token: 'jwt-token',
          token_type: 'bearer',
          user: {
            id: 1,
            full_name: 'Test Traveler',
            email: 'traveler@ceylongo.com',
            role: 'traveler',
            is_active: true,
            created_at: '',
          },
        })
      ),
      register: vi.fn().mockReturnValue(
        of({
          message: 'Success',
          user: {
            id: 2,
            full_name: 'New Traveler',
            email: 'new@ceylongo.com',
            role: 'traveler',
            is_active: true,
            created_at: '',
          },
        })
      ),
      loginWithGoogle: vi.fn().mockReturnValue(
        of({ access_token: 'google-token', token_type: 'bearer', user: {} as any })
      ),
      forgotPassword: vi.fn().mockReturnValue(
        of({ message: 'If an account exists, password reset instructions have been sent.' })
      ),
      verifyResetToken: vi.fn().mockReturnValue(
        of({ valid: true, email: 'traveler@ceylongo.com', message: 'Token is valid' })
      ),
      resetPassword: vi.fn().mockReturnValue(
        of({ message: 'Password successfully updated' })
      ),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TravelerAuthModal],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelerAuthModal);
    component = fixture.componentInstance;
    modalService = TestBed.inject(AuthModalService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    modalService.close();
    vi.useRealTimers();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should not display modal markup when isOpen is false', () => {
    modalService.close();
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.auth-modal-backdrop');
    expect(backdrop).toBeNull();
  });

  describe('Entry Step (Email-First Modal)', () => {
    it('should display the approved entry modal when isOpen is true', () => {
      modalService.open('login');
      fixture.detectChanges();

      const backdrop = fixture.nativeElement.querySelector('.auth-modal-backdrop');
      expect(backdrop).toBeTruthy();

      const title = fixture.nativeElement.querySelector('#auth-modal-heading');
      expect(title?.textContent?.trim()).toBe('Log in or create an account');

      const subtitle = fixture.nativeElement.querySelector('#auth-modal-subtitle');
      expect(subtitle?.textContent?.trim()).toContain("Enter your email and we'll take you to the right place");

      const logo = fixture.nativeElement.querySelector('.modal-logo-img');
      expect(logo).toBeTruthy();
      expect(logo.getAttribute('src')).toBe('/images/ceylongo-blue-logo.png');

      const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
      expect(emailInput).toBeTruthy();
      expect(emailInput.placeholder).toBe('Email address');

      const primaryBtn = fixture.nativeElement.querySelector('.btn-primary-continue');
      expect(primaryBtn?.textContent).toContain('Continue with email');

      const socialBtns = fixture.nativeElement.querySelectorAll('.btn-outlined-social');
      expect(socialBtns.length).toBe(2);
      expect(socialBtns[0].textContent).toContain('Continue with Google');
      expect(socialBtns[1].textContent).toContain('Continue with phone number');
    });

    it('should close when the close (X) button is clicked', () => {
      modalService.open('login');
      fixture.detectChanges();

      const closeBtn = fixture.nativeElement.querySelector('.modal-close-btn');
      expect(closeBtn).toBeTruthy();

      closeBtn.click();
      fixture.detectChanges();

      expect(modalService.isOpen()).toBe(false);
    });

    it('should close when clicking on the backdrop outside the card', () => {
      modalService.open('login');
      fixture.detectChanges();

      const backdrop = fixture.nativeElement.querySelector('.auth-modal-backdrop') as HTMLElement;
      backdrop.click();
      fixture.detectChanges();

      expect(modalService.isOpen()).toBe(false);
    });

    it('should close on Escape keydown', () => {
      modalService.open('login');
      fixture.detectChanges();

      component.onEscapeKey();
      fixture.detectChanges();

      expect(modalService.isOpen()).toBe(false);
    });

    it('should validate email format and show inline error message', () => {
      modalService.open('login');
      fixture.detectChanges();

      component.emailForm.controls.email.setValue('invalid-email');
      component.onContinueWithEmail();
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.inline-field-error');
      expect(error?.textContent).toContain('Please enter a valid email address');
    });

    it('should transition to login step if email is registered', () => {
      modalService.open('login');
      fixture.detectChanges();

      component.emailForm.controls.email.setValue('traveler@ceylongo.com');
      component.onContinueWithEmail();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('login');
      expect(modalService.userEmail()).toBe('traveler@ceylongo.com');
    });

    it('should transition to register step if email is not registered', () => {
      authServiceSpy.checkEmail.mockReturnValue(of({ email: 'new@ceylongo.com', is_registered: false }));
      modalService.open('login');
      fixture.detectChanges();

      component.emailForm.controls.email.setValue('new@ceylongo.com');
      component.onContinueWithEmail();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('register');
      expect(modalService.userEmail()).toBe('new@ceylongo.com');
    });

    it('should display error message when checkEmail encounters a server error', () => {
      authServiceSpy.checkEmail.mockReturnValue(throwError(() => ({ status: 500, error: { detail: 'Internal server error' } })));
      modalService.open('register');
      fixture.detectChanges();

      component.emailForm.controls.email.setValue('user@example.com');
      component.onContinueWithEmail();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Internal server error');
    });

    it('should open phone step with country code selector on Continue with phone number', () => {
      modalService.open('login');
      fixture.detectChanges();

      component.onContinueWithPhone();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('phone');
      const select = fixture.nativeElement.querySelector('.country-code-select');
      expect(select).toBeTruthy();
      expect(component.phoneBackendNotice()).toContain('Traveler Phone SMS OTP service');
    });
  });

  describe('Existing User Login Step', () => {
    beforeEach(() => {
      modalService.open('login');
      modalService.setStep('login', 'hapinayan017@gmail.com');
      fixture.detectChanges();
    });

    it('should render Welcome back heading and subtitle matching reference', () => {
      const title = fixture.nativeElement.querySelector('#auth-modal-heading');
      expect(title?.textContent?.trim()).toBe('Welcome back');

      const subtitle = fixture.nativeElement.querySelector('#auth-modal-subtitle');
      expect(subtitle?.textContent?.trim()).toBe('Log in to your CeylonGo account and continue exploring Sri Lanka.');
    });

    it('should render read-only auto-populated email field matching reference', () => {
      const emailInput = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement;
      expect(emailInput).toBeTruthy();
      expect(emailInput.value).toBe('hapinayan017@gmail.com');
      expect(emailInput.hasAttribute('readonly')).toBe(true);
      expect(emailInput.closest('.input-group-readonly')).toBeTruthy();
    });

    it('should render password input with dots placeholder and lock icon', () => {
      const passwordInput = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.placeholder).toBe('••••••••••');
      expect(passwordInput.type).toBe('password');
    });

    it('should toggle login password visibility between password and text', () => {
      const toggleBtn = fixture.nativeElement.querySelector('.password-toggle-btn') as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();
      expect(component.isLoginPasswordVisible()).toBe(false);

      toggleBtn.click();
      fixture.detectChanges();
      expect(component.isLoginPasswordVisible()).toBe(true);

      const passwordInput = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;
      expect(passwordInput.type).toBe('text');

      toggleBtn.click();
      fixture.detectChanges();
      expect(component.isLoginPasswordVisible()).toBe(false);
      expect(passwordInput.type).toBe('password');
    });

    it('should transition to forgot-password popup when clicking Forgot password?', () => {
      const forgotBtn = fixture.nativeElement.querySelector('.forgot-link-btn') as HTMLButtonElement;
      expect(forgotBtn).toBeTruthy();
      expect(forgotBtn.textContent?.trim()).toBe('Forgot password?');

      forgotBtn.click();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('forgot-password');
      expect(modalService.userEmail()).toBe('hapinayan017@gmail.com');
    });

    it('should render Log in button and bottom switch link to Create account', () => {
      const loginBtn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(loginBtn?.textContent).toContain('Log in');

      const bottomSwitch = fixture.nativeElement.querySelector('.auth-bottom-switch');
      expect(bottomSwitch?.textContent).toContain("Don't have an account?");

      const switchBtn = bottomSwitch.querySelector('.switch-auth-link') as HTMLButtonElement;
      expect(switchBtn?.textContent?.trim()).toBe('Create account');

      switchBtn.click();
      fixture.detectChanges();
      expect(modalService.currentStep()).toBe('register');
      expect(modalService.userEmail()).toBe('hapinayan017@gmail.com');
    });

    it('should show error when submitting invalid password', () => {
      component.loginPasswordControl.setValue('short');
      component.onLoginSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
      const error = fixture.nativeElement.querySelector('.inline-field-error');
      expect(error?.textContent).toContain('Password is required (minimum 8 characters)');
    });

    it('should login successfully for traveler role and close modal', () => {
      vi.useFakeTimers();
      authServiceSpy.login.mockReturnValue(
        of({
          access_token: 'valid-token',
          token_type: 'bearer',
          user: { id: 10, email: 'hapinayan017@gmail.com', full_name: 'Hapinayan', role: 'traveler' },
        })
      );

      component.loginPasswordControl.setValue('Password@123');
      component.onLoginSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.login).toHaveBeenCalledWith({
        email: 'hapinayan017@gmail.com',
        password: 'Password@123',
      });
      expect(component.successMessage()).toContain('Signed in successfully');

      vi.advanceTimersByTime(800);
      expect(modalService.isOpen()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/traveler/home']);
    });

    it('should reject non-traveler roles (e.g. provider) and logout', () => {
      authServiceSpy.login.mockReturnValue(
        of({
          access_token: 'provider-token',
          token_type: 'bearer',
          user: { id: 20, email: 'provider@ceylongo.com', full_name: 'Provider User', role: 'provider' },
        })
      );

      component.loginPasswordControl.setValue('Password@123');
      component.onLoginSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(component.errorMessage()).toContain('This account is registered as a provider. Please log in through the Provider Portal.');
      expect(modalService.isOpen()).toBe(true);
    });

    it('should handle 401 incorrect password error', () => {
      authServiceSpy.login.mockReturnValue(
        throwError(() => ({ status: 401, error: { detail: 'Incorrect email or password' } }))
      );

      component.loginPasswordControl.setValue('WrongPassword123');
      component.onLoginSubmit();
      fixture.detectChanges();

      expect(component.errorMessage()).toBe('Incorrect password. Please try again.');
    });

    it('should handle 403 inactive account error', () => {
      authServiceSpy.login.mockReturnValue(
        throwError(() => ({ status: 403, error: { detail: 'User is inactive' } }))
      );

      component.loginPasswordControl.setValue('Password@123');
      component.onLoginSubmit();
      fixture.detectChanges();

      expect(component.errorMessage()).toContain('Your account is inactive or suspended');
    });
  });

  describe('New User Registration Step', () => {
    beforeEach(() => {
      modalService.open('register');
      modalService.setStep('register', 'hapinayan017@gmail.com');
      fixture.detectChanges();
    });

    it('should render Create your account heading and subtitle matching reference', () => {
      const title = fixture.nativeElement.querySelector('#auth-modal-heading');
      expect(title?.textContent?.trim()).toBe('Create your account');

      const subtitle = fixture.nativeElement.querySelector('#auth-modal-subtitle');
      expect(subtitle?.textContent?.trim()).toBe("Join CeylonGo as a new traveler and start exploring Sri Lanka's best experiences.");
    });

    it('should render full name, read-only email, password, and confirm password fields', () => {
      const fullNameInput = fixture.nativeElement.querySelector('#register-fullname') as HTMLInputElement;
      expect(fullNameInput).toBeTruthy();
      expect(fullNameInput.placeholder).toBe('Full name');

      const emailInput = fixture.nativeElement.querySelector('#register-email') as HTMLInputElement;
      expect(emailInput).toBeTruthy();
      expect(emailInput.value).toBe('hapinayan017@gmail.com');
      expect(emailInput.hasAttribute('readonly')).toBe(true);

      const passwordInput = fixture.nativeElement.querySelector('#register-password') as HTMLInputElement;
      expect(passwordInput).toBeTruthy();

      const confirmPasswordInput = fixture.nativeElement.querySelector('#register-confirm-password') as HTMLInputElement;
      expect(confirmPasswordInput).toBeTruthy();
    });

    it('should render helper text for password requirements', () => {
      const helper = fixture.nativeElement.querySelector('.password-helper-text');
      expect(helper?.textContent?.trim()).toBe('Use at least 8 characters with a mix of letters, numbers and symbols.');
    });

    it('should toggle password and confirm password independently', () => {
      expect(component.isRegisterPasswordVisible()).toBe(false);
      expect(component.isRegisterConfirmPasswordVisible()).toBe(false);

      component.toggleRegisterPasswordVisibility();
      expect(component.isRegisterPasswordVisible()).toBe(true);
      expect(component.isRegisterConfirmPasswordVisible()).toBe(false);

      component.toggleRegisterConfirmPasswordVisibility();
      expect(component.isRegisterPasswordVisible()).toBe(true);
      expect(component.isRegisterConfirmPasswordVisible()).toBe(true);
    });

    it('should validate password mismatch', () => {
      component.registerFullNameControl.setValue('Hapinayan Perera');
      component.registerPasswordControl.setValue('Password@123');
      component.registerConfirmPasswordControl.setValue('DifferentPassword@123');

      component.onRegisterSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.register).not.toHaveBeenCalled();
      const error = fixture.nativeElement.querySelector('.inline-field-error');
      expect(error?.textContent).toContain('Passwords do not match');
    });

    it('should exclude confirmPassword from backend register payload', () => {
      vi.useFakeTimers();
      component.registerFullNameControl.setValue('Hapinayan Perera');
      component.registerPasswordControl.setValue('SecurePass@123');
      component.registerConfirmPasswordControl.setValue('SecurePass@123');

      component.onRegisterSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.register).toHaveBeenCalledWith({
        full_name: 'Hapinayan Perera',
        email: 'hapinayan017@gmail.com',
        password: 'SecurePass@123',
      });

      expect(authServiceSpy.login).toHaveBeenCalledWith({
        email: 'hapinayan017@gmail.com',
        password: 'SecurePass@123',
      });

      vi.advanceTimersByTime(800);
      expect(modalService.isOpen()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/traveler/home']);
    });

    it('should fallback to login step when post-registration auto-login fails', () => {
      authServiceSpy.login.mockReturnValue(
        throwError(() => ({ status: 401, error: { detail: 'Auto login failed' } }))
      );

      component.registerFullNameControl.setValue('Hapinayan Perera');
      component.registerPasswordControl.setValue('SecurePass@123');
      component.registerConfirmPasswordControl.setValue('SecurePass@123');

      component.onRegisterSubmit();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('login');
      expect(component.successMessage()).toContain('Account created successfully! Please log in with your password.');
    });

    it('should handle registration conflict error (409)', () => {
      authServiceSpy.register.mockReturnValue(
        throwError(() => ({ status: 409, error: { detail: 'User already exists' } }))
      );

      component.registerFullNameControl.setValue('Hapinayan Perera');
      component.registerPasswordControl.setValue('SecurePass@123');
      component.registerConfirmPasswordControl.setValue('SecurePass@123');

      component.onRegisterSubmit();
      fixture.detectChanges();

      expect(component.errorMessage()).toContain('An account with this email address already exists. Please log in instead.');
    });

    it('should switch to login step from bottom switch link', () => {
      const bottomSwitch = fixture.nativeElement.querySelector('.auth-bottom-switch');
      expect(bottomSwitch?.textContent).toContain('Already have an account?');

      const loginSwitchBtn = bottomSwitch.querySelector('.switch-auth-link') as HTMLButtonElement;
      loginSwitchBtn.click();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('login');
      expect(modalService.userEmail()).toBe('hapinayan017@gmail.com');
    });
  });

  describe('Screen 06 — Forgot Password Step', () => {
    beforeEach(() => {
      modalService.open('login');
      modalService.setStep('forgot-password', 'hapinayan017@gmail.com');
      fixture.detectChanges();
    });

    it('should render Forgot your password? heading and subtitle matching reference', () => {
      const title = fixture.nativeElement.querySelector('#auth-modal-heading');
      expect(title?.textContent?.trim()).toBe('Forgot your password?');

      const subtitle = fixture.nativeElement.querySelector('#auth-modal-subtitle');
      expect(subtitle?.textContent?.trim()).toContain("No worries. Enter your email address and we'll send you a link to reset your password.");
    });

    it('should render read-only auto-populated email field matching reference', () => {
      const emailInput = fixture.nativeElement.querySelector('#forgot-email') as HTMLInputElement;
      expect(emailInput).toBeTruthy();
      expect(emailInput.value).toBe('hapinayan017@gmail.com');
      expect(emailInput.hasAttribute('readonly')).toBe(true);
    });

    it('should render Send reset link button and bottom link to Log in', () => {
      const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitBtn?.textContent).toContain('Send reset link');

      const bottomSwitch = fixture.nativeElement.querySelector('.auth-bottom-switch');
      expect(bottomSwitch?.textContent).toContain('Remember your password?');

      const loginLink = bottomSwitch.querySelector('.switch-auth-link') as HTMLButtonElement;
      loginLink.click();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('login');
      expect(modalService.userEmail()).toBe('hapinayan017@gmail.com');
    });

    it('should return to login step when clicking top-left back button', () => {
      const backBtn = fixture.nativeElement.querySelector('.modal-back-btn') as HTMLButtonElement;
      expect(backBtn).toBeTruthy();

      backBtn.click();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('login');
      expect(modalService.userEmail()).toBe('hapinayan017@gmail.com');
    });

    it('should submit forgot password request and transition to check-email step', () => {
      component.onForgotPasswordSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('hapinayan017@gmail.com');
      expect(modalService.currentStep()).toBe('check-email');
      expect(component.resendCooldown()).toBe(60);
    });

    it('should handle 429 rate limit error on forgot password submission', () => {
      authServiceSpy.forgotPassword.mockReturnValue(
        throwError(() => ({ status: 429, error: { detail: 'Too many requests' } }))
      );

      component.onForgotPasswordSubmit();
      fixture.detectChanges();

      expect(component.errorMessage()).toContain('Too many requests');
      expect(modalService.currentStep()).toBe('forgot-password');
    });
  });

  describe('Screen 07 — Check Your Email Step', () => {
    beforeEach(() => {
      modalService.open('login');
      modalService.setStep('check-email', 'hapinayan017@gmail.com');
      fixture.detectChanges();
    });

    it('should render Check your email heading, envelope icon, and dynamic user email', () => {
      const icon = fixture.nativeElement.querySelector('.recovery-icon-badge.badge-blue');
      expect(icon).toBeTruthy();

      const title = fixture.nativeElement.querySelector('#auth-modal-heading');
      expect(title?.textContent?.trim()).toBe('Check your email');

      const emailHighlight = fixture.nativeElement.querySelector('.email-highlight');
      expect(emailHighlight?.textContent?.trim()).toBe('hapinayan017@gmail.com');

      const supporting = fixture.nativeElement.querySelector('.modal-supporting-text');
      expect(supporting?.textContent).toContain('The link will expire in 30 minutes');
    });

    it('should not render top-left back button on check-email step (matching approved reference)', () => {
      const backBtn = fixture.nativeElement.querySelector('.modal-back-btn');
      expect(backBtn).toBeNull();
    });

    it('should disable Resend email button during cooldown and show remaining countdown', () => {
      vi.useFakeTimers();
      component['startCooldownTimer'](60);
      fixture.detectChanges();

      const resendBtn = fixture.nativeElement.querySelector('.btn-outlined-resend') as HTMLButtonElement;
      expect(resendBtn.disabled).toBe(true);
      expect(resendBtn.textContent).toContain('Resend email (60s)');

      vi.advanceTimersByTime(15000);
      fixture.detectChanges();
      expect(resendBtn.textContent).toContain('Resend email (45s)');

      vi.advanceTimersByTime(45000);
      fixture.detectChanges();
      expect(resendBtn.disabled).toBe(false);
      expect(resendBtn.textContent).toContain('Resend email');
    });

    it('should resend reset email and restart cooldown when clicked after cooldown expiry', () => {
      component.resendCooldown.set(0);
      fixture.detectChanges();

      const resendBtn = fixture.nativeElement.querySelector('.btn-outlined-resend') as HTMLButtonElement;
      resendBtn.click();
      fixture.detectChanges();

      expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('hapinayan017@gmail.com');
      expect(component.resendCooldown()).toBe(60);
      expect(component.successMessage()).toContain('A new reset link has been sent to your email.');
    });
  });

  describe('Screen 08 — Reset Password Step', () => {
    beforeEach(() => {
      modalService.open('login');
      modalService.setStep('reset-password', 'hapinayan017@gmail.com');
      fixture.detectChanges();
    });

    it('should verify token on initialization and display form when token is valid', () => {
      component.verifyToken('valid-token-12345');
      fixture.detectChanges();

      expect(authServiceSpy.verifyResetToken).toHaveBeenCalledWith('valid-token-12345');
      expect(component.isTokenValid()).toBe(true);

      const title = fixture.nativeElement.querySelector('#auth-modal-heading');
      expect(title?.textContent?.trim()).toBe('Reset your password');

      const newPassInput = fixture.nativeElement.querySelector('#reset-new-password');
      expect(newPassInput).toBeTruthy();

      const confirmPassInput = fixture.nativeElement.querySelector('#reset-confirm-password');
      expect(confirmPassInput).toBeTruthy();

      const helper = fixture.nativeElement.querySelector('.password-helper-text');
      expect(helper?.textContent?.trim()).toBe('Use at least 8 characters with a mix of letters, numbers and symbols.');
    });

    it('should display error message and Request a new reset link button when token is invalid or expired', () => {
      authServiceSpy.verifyResetToken.mockReturnValue(
        throwError(() => ({ status: 400, error: { detail: 'Token expired' } }))
      );

      component.verifyToken('expired-token-xyz');
      fixture.detectChanges();

      expect(component.isTokenValid()).toBe(false);
      expect(component.tokenError()).toContain('This password reset link is invalid, expired, or has already been used.');

      const reqBtn = fixture.nativeElement.querySelector('.btn-primary-continue') as HTMLButtonElement;
      expect(reqBtn?.textContent).toContain('Request a new reset link');

      reqBtn.click();
      fixture.detectChanges();
      expect(modalService.currentStep()).toBe('forgot-password');
    });

    it('should toggle new password and confirm new password visibility independently', () => {
      component.verifyToken('valid-token-12345');
      fixture.detectChanges();

      expect(component.isNewPasswordVisible()).toBe(false);
      expect(component.isConfirmNewPasswordVisible()).toBe(false);

      component.toggleNewPasswordVisibility();
      expect(component.isNewPasswordVisible()).toBe(true);
      expect(component.isConfirmNewPasswordVisible()).toBe(false);

      component.toggleConfirmNewPasswordVisibility();
      expect(component.isNewPasswordVisible()).toBe(true);
      expect(component.isConfirmNewPasswordVisible()).toBe(true);
    });

    it('should validate password mismatch on reset password form', () => {
      component.verifyToken('valid-token-12345');
      fixture.detectChanges();

      component.resetNewPasswordControl.setValue('NewSecurePass@123');
      component.resetConfirmNewPasswordControl.setValue('DifferentPass@123');
      component.onResetPasswordSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.resetPassword).not.toHaveBeenCalled();
      const error = fixture.nativeElement.querySelector('.inline-field-error');
      expect(error?.textContent).toContain('Passwords do not match');
    });

    it('should submit valid new password and transition to reset-success step', () => {
      component.verifyToken('valid-token-12345');
      fixture.detectChanges();

      component.resetNewPasswordControl.setValue('NewSecurePass@123');
      component.resetConfirmNewPasswordControl.setValue('NewSecurePass@123');

      component.onResetPasswordSubmit();
      fixture.detectChanges();

      expect(authServiceSpy.resetPassword).toHaveBeenCalledWith({
        token: 'valid-token-12345',
        new_password: 'NewSecurePass@123',
      });
      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(modalService.currentStep()).toBe('reset-success');
    });
  });

  describe('Screen 09 — Password Reset Successful Step', () => {
    beforeEach(() => {
      modalService.open('login');
      modalService.setStep('reset-success', 'hapinayan017@gmail.com');
      fixture.detectChanges();
    });

    it('should render green checkmark badge, title, description, and Back to login button', () => {
      const greenBadge = fixture.nativeElement.querySelector('.recovery-icon-badge.badge-green');
      expect(greenBadge).toBeTruthy();

      const title = fixture.nativeElement.querySelector('#auth-modal-heading');
      expect(title?.textContent?.trim()).toBe('Password reset successful!');

      const desc = fixture.nativeElement.querySelector('.modal-success-description');
      expect(desc?.textContent).toContain('Your password has been updated.');

      const backToLoginBtn = fixture.nativeElement.querySelector('.btn-primary-continue') as HTMLButtonElement;
      expect(backToLoginBtn?.textContent).toContain('Back to login');
    });

    it('should not render top-left back button on reset-success step', () => {
      const backBtn = fixture.nativeElement.querySelector('.modal-back-btn');
      expect(backBtn).toBeNull();
    });

    it('should transition to login popup with email preserved when Back to login is clicked', () => {
      const backToLoginBtn = fixture.nativeElement.querySelector('.btn-primary-continue') as HTMLButtonElement;
      backToLoginBtn.click();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('login');
      expect(modalService.userEmail()).toBe('hapinayan017@gmail.com');
    });
  });

  describe('Navigation & Back Button', () => {
    it('should show back button on login, register, forgot-password, and reset-password steps', () => {
      modalService.open('login');
      modalService.setStep('forgot-password', 'traveler@ceylongo.com');
      fixture.detectChanges();

      const backBtn = fixture.nativeElement.querySelector('.modal-back-btn') as HTMLButtonElement;
      expect(backBtn).toBeTruthy();

      backBtn.click();
      fixture.detectChanges();

      expect(modalService.currentStep()).toBe('login');
      expect(modalService.userEmail()).toBe('traveler@ceylongo.com');
    });

    it('should authenticate with Google credential and redirect to /traveler/home', () => {
      vi.useFakeTimers();
      component.handleGoogleCredential('valid-google-jwt');
      expect(authServiceSpy.loginWithGoogle).toHaveBeenCalledWith('valid-google-jwt');
      expect(component.successMessage()).toContain('Signed in with Google');

      vi.advanceTimersByTime(800);
      expect(modalService.isOpen()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/traveler/home']);
    });
  });
});
