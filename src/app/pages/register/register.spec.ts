import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should initialize with an invalid form', () => {
    expect(component.registerForm.valid).toBe(false);
  });

  it('should validate password match and complexity', () => {
    component.registerForm.setValue({
      fullName: 'Valid User',
      email: 'user@example.com',
      password: 'Password123!',
      confirmPassword: 'MismatchPassword123!',
      acceptTerms: true,
    });
    expect(component.registerForm.hasError('passwordMismatch')).toBe(true);

    component.registerForm.patchValue({
      confirmPassword: 'Password123!',
    });
    expect(component.registerForm.hasError('passwordMismatch')).toBe(false);
    expect(component.registerForm.valid).toBe(true);
  });

  it('should mark form fields as touched when submitting invalid form', () => {
    component.onRegister();
    expect(component.registerForm.touched).toBe(true);
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('should send only full_name, email, and password to backend on valid submission', () => {
    component.registerForm.setValue({
      fullName: '  Test Traveler  ',
      email: 'traveler@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      acceptTerms: true,
    });

    authServiceMock.register.mockReturnValue(
      of({
        message: 'Account registered successfully',
        user: { id: 1, full_name: 'Test Traveler', email: 'traveler@example.com' },
      })
    );

    component.onRegister();

    expect(authServiceMock.register).toHaveBeenCalledWith({
      full_name: 'Test Traveler',
      email: 'traveler@example.com',
      password: 'Password123!',
    });
    expect(component.successMessage).toContain('Account registered successfully');
  });

  it('should handle duplicate email 409 conflict error', () => {
    component.registerForm.setValue({
      fullName: 'Duplicate User',
      email: 'existing@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      acceptTerms: true,
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
    expect(component.errorMessage).toBe('An account with this email already exists');
  });
});
