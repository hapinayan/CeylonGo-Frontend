import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isPreviewMode = signal<boolean>(!environment.production && !!environment.features?.adminPreviewMode);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  private readonly ALLOWED_ADMIN_ROUTES: readonly string[] = [
    '/admin/dashboard',
    '/admin/travelers',
    '/admin/providers',
    '/admin/verifications',
    '/admin/users',
    '/admin/homestays',
    '/admin/rentals',
    '/admin/drivers',
    '/admin/artisans',
    '/admin/bookings',
    '/admin/payments',
    '/admin/settings',
  ];

  /**
   * Sanitizes returnUrl to prevent open redirects, protocol-relative bypasses,
   * traveler/provider route leaks, and login redirect loops.
   */
  getSafeReturnUrl(rawUrl: unknown): string {
    if (typeof rawUrl !== 'string') {
      return '/admin/dashboard';
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return '/admin/dashboard';
    }

    // Reject protocol-relative, backslash bypasses, external schemes
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.includes('\\') || trimmed.includes(':')) {
      return '/admin/dashboard';
    }

    // Must start with /admin/
    if (!trimmed.startsWith('/admin/')) {
      return '/admin/dashboard';
    }

    // Disallow login loops
    if (trimmed === '/admin/login' || trimmed.startsWith('/admin/login?')) {
      return '/admin/dashboard';
    }

    // Extract path without query parameters or fragments for allowlist checking
    const pathOnly = trimmed.split('?')[0].split('#')[0];

    // Must match one of the allowed admin section paths
    const isAllowed = this.ALLOWED_ADMIN_ROUTES.some(
      (allowed) => pathOnly === allowed || pathOnly.startsWith(`${allowed}/`)
    );

    return isAllowed ? trimmed : '/admin/dashboard';
  }

  loginAsDemoSuperAdmin(): void {
    if (environment.production || !environment.features?.adminPreviewMode) {
      console.warn('Demo authentication is disabled in production environments.');
      return;
    }
    const demoToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMSIsImV4cCI6MjUwMDAwMDAwMH0.demo_signature';
    const demoUser = {
      id: 11,
      full_name: 'CeylonGo Super Admin',
      email: 'admin@ceylongo.com',
      role: 'super_admin',
      admin_role: 'super_admin',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.adminAuthService.setSession(demoToken, demoUser);
    const returnUrl = this.getSafeReturnUrl(this.route.snapshot.queryParams['returnUrl']);
    this.router.navigateByUrl(returnUrl);
  }

  loginAsDemoOperationalAdmin(): void {
    if (environment.production || !environment.features?.adminPreviewMode) {
      console.warn('Demo authentication is disabled in production environments.');
      return;
    }
    const demoToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMiIsImV4cCI6MjUwMDAwMDAwMH0.demo_signature';
    const demoUser = {
      id: 12,
      full_name: 'Operational Manager',
      email: 'ops@ceylongo.com',
      role: 'operations_admin',
      admin_role: 'operations_admin',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.adminAuthService.setSession(demoToken, demoUser);
    const returnUrl = this.getSafeReturnUrl(this.route.snapshot.queryParams['returnUrl']);
    this.router.navigateByUrl(returnUrl);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.adminAuthService.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        const rawReturnUrl = this.route.snapshot.queryParams['returnUrl'];
        const returnUrl = this.getSafeReturnUrl(rawReturnUrl);
        this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.isLoading.set(false);
        if (error.status === 401) {
          this.errorMessage.set('Invalid email or password. Please verify your administrator credentials.');
        } else if (error.status === 403) {
          this.errorMessage.set('Account suspended or inactive. Please contact the platform Super Admin.');
        } else if (error.status === 429) {
          this.errorMessage.set('Too many login attempts. Please wait a few moments and try again.');
        } else if (error.status === 0) {
          this.errorMessage.set(
            'Unable to connect to CeylonGo backend server (port 8000 is unreachable). Please verify the server is running or check network connectivity.'
          );
        } else {
          this.errorMessage.set(error?.error?.detail || 'An unexpected error occurred. Please try again.');
        }
      },
    });
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}
