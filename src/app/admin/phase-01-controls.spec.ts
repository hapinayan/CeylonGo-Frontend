import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';

import { AdminLoginComponent } from './pages/auth/login/admin-login.component';
import { AdminDashboardComponent } from './pages/dashboard/admin-dashboard.component';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminSidebarComponent } from './layout/components/admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from './layout/components/admin-header/admin-header.component';
import { AdminAuthService } from './core/services/admin-auth.service';
import { AdminDashboardService, DEMO_DASHBOARD_METRICS } from './core/services/admin-dashboard.service';
import { AdminUser } from './core/models/admin-auth.models';

describe('Phase 01 Implemented Controls — Interactive Verification', () => {
  let router: Router;
  let authService: AdminAuthService;

  const mockSuperUser: AdminUser = {
    id: 11,
    full_name: 'CeylonGo Super Admin',
    email: 'admin@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  };

  const mockOpsUser: AdminUser = {
    id: 12,
    full_name: 'Operational Manager',
    email: 'ops@ceylongo.com',
    role: 'operations_admin',
    admin_role: 'operations_admin',
    is_active: true,
  };

  describe('Control 1 & 2: Demo Preview Login Controls (Super Admin & Operational Admin)', () => {
    let loginFixture: ComponentFixture<AdminLoginComponent>;
    let loginComp: AdminLoginComponent;
    let authServiceMock: {
      setSession: ReturnType<typeof vi.fn>;
      login: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      authServiceMock = {
        setSession: vi.fn(),
        login: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [AdminLoginComponent],
        providers: [
          provideRouter([]),
          { provide: AdminAuthService, useValue: authServiceMock },
        ],
      }).compileComponents();

      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      loginFixture = TestBed.createComponent(AdminLoginComponent);
      loginComp = loginFixture.componentInstance;
      loginFixture.detectChanges();
    });

    it('Control 1: Preview Super Admin button is clickable, sets super admin session, and navigates', () => {
      const compiled = loginFixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.demo-preview-panel button');
      expect(buttons.length).toBe(2);

      const superAdminBtn = buttons[0] as HTMLButtonElement;
      expect(superAdminBtn.textContent).toContain('Preview Super Admin');

      superAdminBtn.click();

      expect(authServiceMock.setSession).toHaveBeenCalledWith(
        expect.stringContaining('eyJhbGci'),
        expect.objectContaining({ role: 'super_admin' })
      );
      expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('Control 2: Preview Operational Admin button is clickable, sets ops admin session, and navigates', () => {
      const compiled = loginFixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.demo-preview-panel button');
      const opsAdminBtn = buttons[1] as HTMLButtonElement;
      expect(opsAdminBtn.textContent).toContain('Preview Operational Admin');

      opsAdminBtn.click();

      expect(authServiceMock.setSession).toHaveBeenCalledWith(
        expect.stringContaining('eyJhbGci'),
        expect.objectContaining({ role: 'operations_admin' })
      );
      expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('Control 9: Password visibility toggle swaps input type between password and text', () => {
      const passwordInput = loginFixture.nativeElement.querySelector('#admin-password') as HTMLInputElement;
      const toggleBtn = loginFixture.nativeElement.querySelector('.toggle-password-btn') as HTMLButtonElement;

      expect(passwordInput.type).toBe('password');
      expect(loginComp.showPassword()).toBe(false);

      toggleBtn.click();
      loginFixture.detectChanges();

      expect(passwordInput.type).toBe('text');
      expect(loginComp.showPassword()).toBe(true);

      toggleBtn.click();
      loginFixture.detectChanges();

      expect(passwordInput.type).toBe('password');
      expect(loginComp.showPassword()).toBe(false);
    });

    it('Control 10: Login form validation enforces required fields and disables submit button when invalid', () => {
      const submitBtn = loginFixture.nativeElement.querySelector('.btn-submit') as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      loginComp.loginForm.patchValue({ email: 'invalid-email', password: '' });
      loginComp.loginForm.markAllAsTouched();
      loginFixture.detectChanges();

      expect(submitBtn.disabled).toBe(true);
      const emailError = loginFixture.nativeElement.querySelector('#email-error');
      expect(emailError?.textContent).toContain('valid email address');

      loginComp.loginForm.patchValue({ email: 'admin@ceylongo.com', password: 'ValidPassword123!' });
      loginFixture.detectChanges();

      expect(submitBtn.disabled).toBe(false);
    });
  });

  describe('Control 3 & 4: Sidebar Navigation, Collapse and Future Module Protection', () => {
    let sidebarFixture: ComponentFixture<AdminSidebarComponent>;
    let sidebarComp: AdminSidebarComponent;
    let isSuperAdminSig: ReturnType<typeof signal<boolean>>;

    beforeEach(async () => {
      isSuperAdminSig = signal(true);

      await TestBed.configureTestingModule({
        imports: [AdminSidebarComponent],
        providers: [
          provideRouter([]),
          {
            provide: AdminAuthService,
            useValue: {
              isSuperAdmin: isSuperAdminSig,
              currentUser: signal(mockSuperUser),
              roleDisplayName: signal('Super Admin'),
            },
          },
        ],
      }).compileComponents();

      sidebarFixture = TestBed.createComponent(AdminSidebarComponent);
      sidebarComp = sidebarFixture.componentInstance;
      sidebarFixture.detectChanges();
    });

    it('Control 3: Dashboard link is implemented, has active class, and has valid route', () => {
      const compiled = sidebarFixture.nativeElement as HTMLElement;
      const dashboardLink = compiled.querySelector('a.active-link[href="/admin/dashboard"]');
      expect(dashboardLink).toBeTruthy();
      expect(dashboardLink?.textContent).toContain('Dashboard');
      expect(dashboardLink?.querySelector('.active-badge')?.textContent).toContain('Active');
    });

    it('Control 4: Sidebar collapse button emits toggleCollapse event', () => {
      const toggleSpy = vi.fn();
      sidebarComp.toggleCollapse.subscribe(toggleSpy);

      const collapseBtn = sidebarFixture.nativeElement.querySelector('.collapse-toggle-btn') as HTMLButtonElement;
      expect(collapseBtn).toBeTruthy();
      collapseBtn.click();

      expect(toggleSpy).toHaveBeenCalled();
    });

    it('Control 4b: Sidebar collapse arrow remains accessible in both expanded and collapsed states', () => {
      // In expanded state (default)
      let collapseBtn = sidebarFixture.nativeElement.querySelector('.collapse-toggle-btn') as HTMLButtonElement;
      expect(collapseBtn).toBeTruthy();
      expect(collapseBtn.getAttribute('aria-label')).toBe('Collapse sidebar');

      // In collapsed state
      sidebarFixture.componentRef.setInput('collapsed', true);
      sidebarFixture.detectChanges();

      collapseBtn = sidebarFixture.nativeElement.querySelector('.collapse-toggle-btn') as HTMLButtonElement;
      expect(collapseBtn).toBeTruthy();
      expect(collapseBtn.getAttribute('aria-label')).toBe('Expand sidebar');
    });

    it('Protection: Future modules remain disabled with Upcoming badges and informative tooltips', () => {
      const compiled = sidebarFixture.nativeElement as HTMLElement;
      const disabledLinks = compiled.querySelectorAll('.disabled-link');
      expect(disabledLinks.length).toBeGreaterThan(10);

      // Verify disabled links are div elements with tooltips and Upcoming badges
      disabledLinks.forEach((el) => {
        expect(el.tagName.toLowerCase()).toBe('div');
        expect(el.getAttribute('title')).toContain('Upcoming');
        expect(el.querySelector('.phase-badge')?.textContent).toContain('Upcoming');
      });

      // Verify no routerLink attributes on disabled modules
      expect(compiled.querySelectorAll('.disabled-link[href]').length).toBe(0);
    });

    it('Protection: Super Admin Administration group is hidden for Operational Admin', () => {
      isSuperAdminSig.set(false);
      sidebarFixture.detectChanges();

      const compiled = sidebarFixture.nativeElement as HTMLElement;
      expect(compiled.textContent).not.toContain('Admin Accounts');
      expect(compiled.textContent).not.toContain('Audit Logs');
      expect(compiled.textContent).not.toContain('System Settings');
    });
  });

  describe('Control 5, 7 & 8: Layout, Mobile Drawer, Header Controls and Sign Out', () => {
    let layoutFixture: ComponentFixture<AdminLayoutComponent>;
    let layoutComp: AdminLayoutComponent;

    let headerFixture: ComponentFixture<AdminHeaderComponent>;
    let headerComp: AdminHeaderComponent;
    let logoutSpy: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      logoutSpy = vi.fn();

      await TestBed.configureTestingModule({
        imports: [AdminLayoutComponent, AdminHeaderComponent, AdminSidebarComponent],
        providers: [
          provideRouter([]),
          {
            provide: AdminAuthService,
            useValue: {
              isSuperAdmin: signal(true),
              currentUser: signal(mockSuperUser),
              roleDisplayName: signal('Super Admin'),
              logout: logoutSpy,
            },
          },
        ],
      }).compileComponents();

      layoutFixture = TestBed.createComponent(AdminLayoutComponent);
      layoutComp = layoutFixture.componentInstance;
      layoutFixture.detectChanges();

      headerFixture = TestBed.createComponent(AdminHeaderComponent);
      headerComp = headerFixture.componentInstance;
      headerFixture.detectChanges();
    });

    it('Control 4: Layout toggles sidebar collapsed signal', () => {
      expect(layoutComp.isSidebarCollapsed()).toBe(false);
      layoutComp.toggleSidebar();
      expect(layoutComp.isSidebarCollapsed()).toBe(true);
      layoutComp.toggleSidebar();
      expect(layoutComp.isSidebarCollapsed()).toBe(false);
    });

    it('Responsive Control: Desktop header has no duplicate collapse button, only mobile menu trigger', () => {
      const desktopCollapseBtn = headerFixture.nativeElement.querySelector('.desktop-collapse-btn');
      expect(desktopCollapseBtn).toBeNull();

      const mobileMenuBtn = headerFixture.nativeElement.querySelector('.mobile-menu-btn') as HTMLButtonElement;
      expect(mobileMenuBtn).toBeTruthy();
      expect(mobileMenuBtn.getAttribute('aria-label')).toBe('Open mobile navigation menu');
    });

    it('Control 5: Mobile drawer opens and closes correctly with backdrop', () => {
      expect(layoutComp.isMobileDrawerOpen()).toBe(false);

      layoutComp.openMobileDrawer();
      layoutFixture.detectChanges();
      expect(layoutComp.isMobileDrawerOpen()).toBe(true);

      const backdrop = layoutFixture.nativeElement.querySelector('.mobile-backdrop') as HTMLElement;
      expect(backdrop).toBeTruthy();

      backdrop.click();
      layoutFixture.detectChanges();
      expect(layoutComp.isMobileDrawerOpen()).toBe(false);
    });

    it('Control 7: Profile dropdown opens and displays user details and role', () => {
      expect(headerComp.isMenuOpen()).toBe(false);

      const profileBtn = headerFixture.nativeElement.querySelector('.user-profile-btn') as HTMLButtonElement;
      profileBtn.click();
      headerFixture.detectChanges();

      expect(headerComp.isMenuOpen()).toBe(true);
      const dropdown = headerFixture.nativeElement.querySelector('.profile-dropdown-card');
      expect(dropdown).toBeTruthy();
      expect(dropdown?.textContent).toContain('CeylonGo Super Admin');
      expect(dropdown?.textContent).toContain('Super Admin');
    });

    it('Control 8: Sign Out button inside profile dropdown calls auth logout', () => {
      headerComp.isMenuOpen.set(true);
      headerFixture.detectChanges();

      const logoutBtn = headerFixture.nativeElement.querySelector('.logout-action') as HTMLButtonElement;
      expect(logoutBtn).toBeTruthy();
      logoutBtn.click();

      expect(logoutSpy).toHaveBeenCalled();
      expect(headerComp.isMenuOpen()).toBe(false);
    });
  });

  describe('Control 6: Dashboard Refresh Data and Accurate Queue Counts', () => {
    let dashFixture: ComponentFixture<AdminDashboardComponent>;
    let dashComp: AdminDashboardComponent;
    let dashServiceMock: {
      getDashboard: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      dashServiceMock = {
        getDashboard: vi.fn().mockReturnValue(of(DEMO_DASHBOARD_METRICS)),
      };

      await TestBed.configureTestingModule({
        imports: [AdminDashboardComponent],
        providers: [
          provideRouter([]),
          { provide: AdminDashboardService, useValue: dashServiceMock },
          {
            provide: AdminAuthService,
            useValue: {
              currentUser: signal(mockSuperUser),
              isSuperAdmin: signal(true),
              roleDisplayName: signal('Super Admin'),
            },
          },
        ],
      }).compileComponents();

      dashFixture = TestBed.createComponent(AdminDashboardComponent);
      dashComp = dashFixture.componentInstance;
      dashFixture.detectChanges();
    });

    it('Control 6: Refresh Data button is clickable, calls service, and updates last updated timestamp', () => {
      const initialTimestamp = dashComp.lastUpdated();
      expect(initialTimestamp).toBeTruthy();

      const refreshBtn = dashFixture.nativeElement.querySelector('.btn-refresh') as HTMLButtonElement;
      expect(refreshBtn).toBeTruthy();
      expect(refreshBtn.disabled).toBe(false);

      refreshBtn.click();
      dashFixture.detectChanges();

      expect(dashServiceMock.getDashboard).toHaveBeenCalledTimes(2); // Initial + Refresh
      expect(dashComp.lastUpdated()).toBeTruthy();
    });

    it('Accurate Queue Count: Sums 7 + 4 + 3 + 2 + 3 + 5 = 24 Pending Items', () => {
      expect(dashComp.totalPendingApprovals).toBe(24);
      const queuePill = dashFixture.nativeElement.querySelector('.queue-total-pill');
      expect(queuePill?.textContent).toContain('24 Pending Items');
    });
  });
});
