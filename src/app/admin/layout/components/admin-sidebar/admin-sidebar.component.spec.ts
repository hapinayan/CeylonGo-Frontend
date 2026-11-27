import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminSidebarComponent } from './admin-sidebar.component';

describe('AdminSidebarComponent', () => {
  let component: AdminSidebarComponent;
  let fixture: ComponentFixture<AdminSidebarComponent>;
  let isSuperAdminSignal = signal<boolean>(false);

  beforeEach(async () => {
    isSuperAdminSignal = signal<boolean>(false);

    await TestBed.configureTestingModule({
      imports: [AdminSidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AdminAuthService,
          useValue: {
            isSuperAdmin: isSuperAdminSignal,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create sidebar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render Dashboard navigation link as implemented and active', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const dashboardLink = compiled.querySelector('a.nav-link[href="/admin/dashboard"]');
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink?.textContent).toContain('Dashboard');
  });

  it('should render Travelers and Service Providers as active implemented routes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const travelersLink = compiled.querySelector('a.nav-link[href="/admin/travelers"]');
    expect(travelersLink).toBeTruthy();
    expect(travelersLink?.textContent).toContain('Travelers');

    const providersLink = compiled.querySelector('a.nav-link[href="/admin/providers"]');
    expect(providersLink).toBeTruthy();
    expect(providersLink?.textContent).toContain('Service Providers');

    // Confirm Verifications and Homestays are active
    const verificationsLink = compiled.querySelector('a.nav-link[href="/admin/verifications"]');
    expect(verificationsLink).toBeTruthy();
    expect(verificationsLink?.textContent).toContain('Verifications');

    const homestaysLink = compiled.querySelector('a.nav-link[href="/admin/homestays"]');
    expect(homestaysLink).toBeTruthy();
    expect(homestaysLink?.textContent).toContain('Homestays');

    const walletsLink = compiled.querySelector('a.nav-link[href="/admin/wallets"]');
    expect(walletsLink).toBeTruthy();
    expect(walletsLink?.textContent).toContain('Wallet & Commission');
  });

  it('should render all modules as active and implemented routes across all phases', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const disabledLinks = compiled.querySelectorAll('.disabled-link');
    expect(disabledLinks.length).toBe(0);

    const activeBadges = compiled.querySelectorAll('.active-badge');
    expect(activeBadges.length).toBeGreaterThan(0);
    activeBadges.forEach((badge) => {
      expect(badge.textContent).toContain('Active');
    });
  });

  it('should hide Super Admin administration group when user is not super admin', () => {
    isSuperAdminSignal.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Admin Accounts');
    expect(compiled.textContent).not.toContain('Audit Logs');
  });

  it('should display Super Admin administration group when user is super admin', () => {
    isSuperAdminSignal.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Administration');
    expect(compiled.textContent).toContain('Admin Accounts');
    expect(compiled.textContent).toContain('Audit Logs');
  });

  it('should emit toggleCollapse output when collapse toggle button is clicked', () => {
    const spy = vi.spyOn(component.toggleCollapse, 'emit');
    const toggleBtn = fixture.nativeElement.querySelector('.collapse-toggle-btn') as HTMLButtonElement;
    toggleBtn.click();
    expect(spy).toHaveBeenCalled();
  });
});
