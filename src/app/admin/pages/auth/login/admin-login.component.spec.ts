import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AdminTokenResponse } from '../../../core/models/admin-auth.models';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { environment } from '../../../../../environments/environment';
import { AdminLoginComponent } from './admin-login.component';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let adminAuthServiceMock: {
    login: ReturnType<typeof vi.fn>;
    setSession: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  const mockTokenResponse: AdminTokenResponse = {
    access_token: 'fake-jwt',
    token_type: 'bearer',
    user: {
      id: 1,
      full_name: 'Test Admin',
      email: 'admin@ceylongo.com',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
    },
  };

  beforeEach(async () => {
    adminAuthServiceMock = {
      login: vi.fn(),
      setSession: vi.fn(),
    };
    routerMock = {
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        { provide: AdminAuthService, useValue: adminAuthServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: { returnUrl: '/admin/dashboard' } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty, invalid form', () => {
    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should validate email format', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.valid).toBe(false);

    emailControl?.setValue('admin@ceylongo.com');
    expect(emailControl?.valid).toBe(true);
  });

  it('should toggle password visibility signal', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('should not submit if form is invalid', () => {
    component.onSubmit();
    expect(adminAuthServiceMock.login).not.toHaveBeenCalled();
    expect(component.loginForm.touched).toBe(true);
  });

  it('should submit valid credentials and navigate to returnUrl on success', () => {
    adminAuthServiceMock.login.mockReturnValue(of(mockTokenResponse));

    component.loginForm.setValue({
      email: 'admin@ceylongo.com',
      password: 'CorrectPassword123!',
    });

    component.onSubmit();

    expect(adminAuthServiceMock.login).toHaveBeenCalledWith({
      email: 'admin@ceylongo.com',
      password: 'CorrectPassword123!',
    });
    expect(component.isLoading()).toBe(false);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('should display specific error message on 401 Unauthorized', () => {
    adminAuthServiceMock.login.mockReturnValue(
      throwError(() => ({ status: 401, error: { detail: 'Invalid credentials' } }))
    );

    component.loginForm.setValue({
      email: 'wrong@ceylongo.com',
      password: 'WrongPassword!',
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Invalid email or password');
  });

  it('should display specific error message on 429 Too Many Requests', () => {
    adminAuthServiceMock.login.mockReturnValue(
      throwError(() => ({ status: 429, error: { detail: 'Rate limit exceeded' } }))
    );

    component.loginForm.setValue({
      email: 'admin@ceylongo.com',
      password: 'SomePassword!',
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Too many login attempts');
  });

  it('should display specific error message on network failure (status 0)', () => {
    adminAuthServiceMock.login.mockReturnValue(
      throwError(() => ({ status: 0, error: 'Network failure' }))
    );

    component.loginForm.setValue({
      email: 'admin@ceylongo.com',
      password: 'SomePassword!',
    });

    component.onSubmit();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Unable to connect to CeylonGo backend server');
  });

  describe('Isolated Demo Preview Mode', () => {
    beforeEach(() => {
      // Enable preview mode for these tests (environment has it off by default)
      if (environment.features) {
        environment.features.adminPreviewMode = true;
      }
      (environment as { production: boolean }).production = false;
    });

    afterEach(() => {
      if (environment.features) {
        environment.features.adminPreviewMode = false;
      }
      (environment as { production: boolean }).production = true;
    });

    it('should set Super Admin session and navigate to dashboard', () => {
      adminAuthServiceMock.setSession = vi.fn();
      component.loginAsDemoSuperAdmin();
      expect(adminAuthServiceMock.setSession).toHaveBeenCalledWith(
        expect.stringContaining('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'),
        expect.objectContaining({ role: 'super_admin' })
      );
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('should set Operational Admin session and navigate to dashboard', () => {
      adminAuthServiceMock.setSession = vi.fn();
      component.loginAsDemoOperationalAdmin();
      expect(adminAuthServiceMock.setSession).toHaveBeenCalledWith(
        expect.stringContaining('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'),
        expect.objectContaining({ role: 'admin' })
      );
      expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('should refuse synthetic demo login in production mode', () => {
      const origProd = environment.production;
      const origMode = environment.features?.adminPreviewMode;
      try {
        (environment as { production: boolean }).production = true;
        if (environment.features) {
          environment.features.adminPreviewMode = false;
        }

        adminAuthServiceMock.setSession = vi.fn();
        component.loginAsDemoSuperAdmin();
        expect(adminAuthServiceMock.setSession).not.toHaveBeenCalled();

        component.loginAsDemoOperationalAdmin();
        expect(adminAuthServiceMock.setSession).not.toHaveBeenCalled();
      } finally {
        (environment as { production: boolean }).production = origProd;
        if (environment.features) {
          environment.features.adminPreviewMode = origMode;
        }
      }
    });
  });

  describe('returnUrl validation (FINDING-SEC-01)', () => {
    it('should accept valid internal admin routes', () => {
      expect(component.getSafeReturnUrl('/admin/dashboard')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('/admin/travelers')).toBe('/admin/travelers');
      expect(component.getSafeReturnUrl('/admin/providers')).toBe('/admin/providers');
      expect(component.getSafeReturnUrl('/admin/homestays?page=2')).toBe('/admin/homestays?page=2');
      expect(component.getSafeReturnUrl('/admin/bookings/123')).toBe('/admin/bookings/123');
    });

    it('should reject external URLs and protocol-relative URLs and fallback to /admin/dashboard', () => {
      expect(component.getSafeReturnUrl('https://evil.com')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('http://evil.com/admin/dashboard')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('//evil.com/admin')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('/\\evil.com')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('javascript:alert(1)')).toBe('/admin/dashboard');
    });

    it('should reject traveler and provider routes', () => {
      expect(component.getSafeReturnUrl('/homestays')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('/provider/dashboard')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('/auth/login')).toBe('/admin/dashboard');
    });

    it('should reject login redirect loops', () => {
      expect(component.getSafeReturnUrl('/admin/login')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('/admin/login?returnUrl=/admin/dashboard')).toBe('/admin/dashboard');
    });

    it('should reject non-string or malformed inputs', () => {
      expect(component.getSafeReturnUrl(null)).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl(undefined)).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl('   ')).toBe('/admin/dashboard');
      expect(component.getSafeReturnUrl(12345)).toBe('/admin/dashboard');
    });
  });
});
