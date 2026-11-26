import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAccountItem } from '../../core/models/admin-management.models';
import { AdminManagementService } from '../../core/services/admin-management.service';
import { AdminManagementComponent } from './admin-management.component';

describe('AdminManagementComponent', () => {
  let component: AdminManagementComponent;
  let fixture: ComponentFixture<AdminManagementComponent>;

  const mockAdmin: AdminAccountItem = {
    id: 1,
    email: 'admin@ceylongo.lk',
    full_name: 'Platform Super Administrator',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
    department: 'Governance',
    status: 'active',
  };

  const mockService = {
    canManageAdmins: () => true,
    getAdminAccounts: vi.fn().mockReturnValue(
      of({ items: [mockAdmin], total: 1, page: 1, page_size: 20, total_pages: 1 })
    ),
    inviteAdmin: vi.fn().mockReturnValue(of({ ...mockAdmin, id: 2, status: 'invited' })),
    toggleAdminStatus: vi.fn().mockReturnValue(of({ ...mockAdmin, is_active: false, status: 'inactive' })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminManagementComponent],
      providers: [{ provide: AdminManagementService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load admin accounts on init', () => {
    expect(component).toBeTruthy();
    expect(component.admins.length).toBe(1);
    expect(component.admins[0].email).toBe('admin@ceylongo.lk');
  });

  it('should filter by role and status', () => {
    component.onRoleChange('super_admin');
    expect(component.selectedRole).toBe('super_admin');
    expect(mockService.getAdminAccounts).toHaveBeenCalled();

    component.onStatusChange('active');
    expect(component.selectedStatus).toBe('active');
  });

  it('should open and close invite modal and trigger invite', () => {
    component.openInviteModal();
    expect(component.isInviteModalOpen).toBe(true);

    component.handleInvite({
      email: 'new@ceylongo.lk',
      full_name: 'New Officer',
      role: 'operations_admin',
    });
    expect(mockService.inviteAdmin).toHaveBeenCalled();
    expect(component.isInviteModalOpen).toBe(false);
  });
});
