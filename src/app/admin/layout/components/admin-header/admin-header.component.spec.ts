import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AdminUser } from '../../../core/models/admin-auth.models';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminHeaderComponent } from './admin-header.component';

describe('AdminHeaderComponent', () => {
  let component: AdminHeaderComponent;
  let fixture: ComponentFixture<AdminHeaderComponent>;
  let logoutSpy: ReturnType<typeof vi.fn>;
  let routerEvents$: Subject<any>;
  let mockRouter: any;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    full_name: 'Devin Rathnayake',
    email: 'devin@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  });
  const mockIsSuperAdminSignal = signal<boolean>(true);
  const mockRoleNameSignal = signal<string>('Super Admin');

  beforeEach(async () => {
    logoutSpy = vi.fn();
    routerEvents$ = new Subject<any>();
    mockRouter = {
      url: '/admin/dashboard',
      events: routerEvents$.asObservable(),
      routerState: {
        root: {
          firstChild: null,
          snapshot: { data: {} },
        },
      },
      createUrlTree: vi.fn(),
      serializeUrl: vi.fn().mockReturnValue('/admin/dashboard'),
    };

    await TestBed.configureTestingModule({
      imports: [AdminHeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AdminAuthService,
          useValue: {
            currentUser: mockUserSignal,
            isSuperAdmin: mockIsSuperAdminSignal,
            roleDisplayName: mockRoleNameSignal,
            logout: logoutSpy,
          },
        },
        {
          provide: Router,
          useValue: mockRouter,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create header component', () => {
    expect(component).toBeTruthy();
  });

  it('should display authenticated admin name and role badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-name')?.textContent).toContain('Devin Rathnayake');
    expect(compiled.querySelector('.user-role-badge')?.textContent).toContain('Super Admin');
  });

  it('should compute user initials correctly', () => {
    expect(component.userInitials).toBe('DR');
  });

  it('should toggle profile menu on profile button click', () => {
    expect(component.isMenuOpen()).toBe(false);

    component.toggleProfileMenu();
    expect(component.isMenuOpen()).toBe(true);

    component.toggleProfileMenu();
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should call adminAuthService.logout when sign out is clicked', () => {
    component.isMenuOpen.set(true);
    fixture.detectChanges();

    const logoutBtn = fixture.nativeElement.querySelector('.logout-action') as HTMLButtonElement;
    logoutBtn.click();

    expect(logoutSpy).toHaveBeenCalled();
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should close profile menu on outside document click', () => {
    component.isMenuOpen.set(true);
    expect(component.isMenuOpen()).toBe(true);

    component.onDocumentClick(new MouseEvent('click'));
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should emit openMobileDrawer when mobile menu button is clicked', () => {
    const openDrawerSpy = vi.fn();
    component.openMobileDrawer.subscribe(openDrawerSpy);

    const menuBtn = fixture.nativeElement.querySelector('.mobile-menu-btn') as HTMLButtonElement;
    expect(menuBtn).toBeTruthy();
    menuBtn.click();

    expect(openDrawerSpy).toHaveBeenCalled();
  });

  it('should not contain desktop collapse button, preventing desktop control duplication', () => {
    const desktopCollapseBtn = fixture.nativeElement.querySelector('.desktop-collapse-btn');
    expect(desktopCollapseBtn).toBeNull();
  });

  it('should initialize with correct breadcrumb from router.url', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.crumb-current')?.textContent).toBe('Dashboard');
    expect(component.currentBreadcrumb()).toBe('Dashboard');
  });

  it('should render root breadcrumb as clickable link targeting /admin/dashboard', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rootLink = compiled.querySelector('.crumb-parent.crumb-link') as HTMLAnchorElement;
    expect(rootLink).toBeTruthy();
    expect(rootLink.textContent).toContain('CeylonGo Administration');
    expect(rootLink.getAttribute('href') || rootLink.getAttribute('ng-reflect-router-link')).toBeTruthy();
  });

  it('should dynamically update breadcrumb on NavigationEnd events for all admin routes', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Travelers route
    routerEvents$.next(new NavigationEnd(1, '/admin/travelers', '/admin/travelers'));
    fixture.detectChanges();
    expect(component.currentBreadcrumb()).toBe('Travelers');
    expect(compiled.querySelector('.crumb-current')?.textContent).toBe('Travelers');

    // Providers route
    routerEvents$.next(new NavigationEnd(2, '/admin/providers', '/admin/providers'));
    fixture.detectChanges();
    expect(component.currentBreadcrumb()).toBe('Service Providers');
    expect(compiled.querySelector('.crumb-current')?.textContent).toBe('Service Providers');

    // Verifications route
    routerEvents$.next(new NavigationEnd(3, '/admin/verifications', '/admin/verifications'));
    fixture.detectChanges();
    expect(component.currentBreadcrumb()).toBe('Verifications');
    expect(compiled.querySelector('.crumb-current')?.textContent).toBe('Verifications');

    // Homestays route
    routerEvents$.next(new NavigationEnd(4, '/admin/homestays', '/admin/homestays'));
    fixture.detectChanges();
    expect(component.currentBreadcrumb()).toBe('Homestays');
    expect(compiled.querySelector('.crumb-current')?.textContent).toBe('Homestays');

    // Return to Dashboard
    routerEvents$.next(new NavigationEnd(5, '/admin/dashboard', '/admin/dashboard'));
    fixture.detectChanges();
    expect(component.currentBreadcrumb()).toBe('Dashboard');
    expect(compiled.querySelector('.crumb-current')?.textContent).toBe('Dashboard');
  });

  it('should strip query parameters and hash fragments when resolving breadcrumbs', () => {
    routerEvents$.next(new NavigationEnd(1, '/admin/travelers?page=2&status=active#top', '/admin/travelers?page=2&status=active#top'));
    fixture.detectChanges();
    expect(component.currentBreadcrumb()).toBe('Travelers');

    routerEvents$.next(new NavigationEnd(2, '/admin/verifications?category=tour_guide', '/admin/verifications?category=tour_guide'));
    fixture.detectChanges();
    expect(component.currentBreadcrumb()).toBe('Verifications');
  });
});
