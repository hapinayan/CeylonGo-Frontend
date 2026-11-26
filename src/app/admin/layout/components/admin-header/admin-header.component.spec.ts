import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { AdminUser } from '../../../core/models/admin-auth.models';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AdminHeaderComponent } from './admin-header.component';

describe('AdminHeaderComponent', () => {
  let component: AdminHeaderComponent;
  let fixture: ComponentFixture<AdminHeaderComponent>;
  let logoutSpy: ReturnType<typeof vi.fn>;

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

    await TestBed.configureTestingModule({
      imports: [AdminHeaderComponent],
      providers: [
        {
          provide: AdminAuthService,
          useValue: {
            currentUser: mockUserSignal,
            isSuperAdmin: mockIsSuperAdminSignal,
            roleDisplayName: mockRoleNameSignal,
            logout: logoutSpy,
          },
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
});
