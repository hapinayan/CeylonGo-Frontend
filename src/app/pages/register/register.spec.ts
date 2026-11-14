import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { Register } from './register';

describe('Register Component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authServiceMock: { register: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      register: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([
          { path: 'register-success', component: class {} },
          { path: 'login', component: class {} },
          { path: 'auth', component: class {} },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'email' ? 'traveler@ceylongo.com' : null),
              },
            },
          },
        },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize and prefill email from route query param', () => {
    expect(component.registerForm.get('email')?.value).toBe('traveler@ceylongo.com');
    expect(component.registerForm.valid).toBe(false);
  });

  it('should validate password match and complexity', () => {
    component.registerForm.setValue({
      fullName: 'Valid User',
      email: 'user@example.com',
      password: 'Password123!',
      confirmPassword: 'MismatchPassword123!',
    });
    expect(component.registerForm.hasError('passwordMismatch')).toBe(true);

    component.registerForm.patchValue({
      confirmPassword: 'Password123!',
    });
    expect(component.registerForm.hasError('passwordMismatch')).toBe(false);
    expect(component.registerForm.valid).toBe(true);
  });

  it('should mark form fields as touched when submitting invalid form', () => {
    component.registerForm.setValue({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    component.onRegister();
    expect(component.registerForm.touched).toBe(true);
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('should send full_name, email, and password to backend on valid submission', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.registerForm.setValue({
      fullName: '  Test Traveler  ',
      email: 'traveler@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    authServiceMock.register.mockReturnValue(
      of({
        message: 'Account registered successfully',
        user: { id: 1, full_name: 'Test Traveler', email: 'traveler@example.com', role: 'traveler', is_active: true, created_at: '' },
      })
    );

    component.onRegister();

    expect(authServiceMock.register).toHaveBeenCalledWith({
      full_name: 'Test Traveler',
      email: 'traveler@example.com',
      password: 'Password123!',
    });
    expect(component.successMessage).toContain('Registration completed successfully');
    expect(navigateSpy).toHaveBeenCalledWith(['/register-success'], {
      state: { fullName: 'Test Traveler', email: 'traveler@example.com' },
    });
  });

  it('should toggle password and confirm password visibility', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);

    expect(component.showConfirmPassword).toBe(false);
    component.toggleConfirmPassword();
    expect(component.showConfirmPassword).toBe(true);
    component.toggleConfirmPassword();
    expect(component.showConfirmPassword).toBe(false);
  });

  it('should navigate to /auth on closeModal and goBack', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.closeModal();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth']);

    component.goBack();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should navigate to /auth on backdrop click', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const backdropEl = document.createElement('div');
    backdropEl.className = 'register-page';

    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: backdropEl, enumerable: true });

    component.onBackdropClick(event);
    expect(navigateSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should not dismiss modal when clicking modal content', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const modalEl = document.createElement('div');
    modalEl.className = 'register-modal';

    const event = new MouseEvent('click');
    Object.defineProperty(event, 'target', { value: modalEl, enumerable: true });

    component.onBackdropClick(event);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should handle duplicate email 409 conflict error', () => {
    component.registerForm.setValue({
      fullName: 'Duplicate User',
      email: 'existing@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    authServiceMock.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'An account with this email already exists' },
          })
      )
    );

    component.onRegister();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('This email is already registered. Please sign in.');
  });

  it('should handle 422 validation error', () => {
    component.registerForm.setValue({
      fullName: 'Invalid Details',
      email: 'invalid@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    authServiceMock.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { detail: 'Invalid password format' },
          })
      )
    );

    component.onRegister();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Please verify your registration details');
  });

  it('should handle 0 network error', () => {
    component.registerForm.setValue({
      fullName: 'Network Fail',
      email: 'network@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });

    authServiceMock.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 0,
          })
      )
    );

    component.onRegister();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Cannot connect to backend server');
  });
});
