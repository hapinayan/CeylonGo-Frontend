import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminManagementService } from './admin-management.service';

describe('AdminManagementService', () => {
  let service: AdminManagementService;

  const mockUserSignal = signal<AdminUser | null>({
    id: 1,
    email: 'admin@ceylongo.lk',
    full_name: 'Super Admin',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  });

  const mockAuthService = {
    currentUser: mockUserSignal,
    isDemoSession: () => true,
  };

  const mockPreviewState = {
    getAdminAccounts: () => ({
      items: [{ id: 1, email: 'admin@ceylongo.lk', full_name: 'Admin', role: 'super_admin', status: 'active' }],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    }),
    inviteAdmin: () => ({
      id: 2,
      email: 'new@ceylongo.lk',
      full_name: 'New Admin',
      role: 'admin',
      status: 'invited',
    }),
    toggleAdminStatus: () => ({
      id: 2,
      is_active: false,
      status: 'inactive',
    }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        AdminManagementService,
        { provide: AdminAuthService, useValue: mockAuthService },
        { provide: AdminPreviewStateService, useValue: mockPreviewState },
      ],
    });

    service = TestBed.inject(AdminManagementService);
  });

  it('should be created and expose canManageAdmins', () => {
    expect(service).toBeTruthy();
    expect(service.canManageAdmins()).toBe(true);
  });

  it('should fetch admin accounts', () => {
    service.getAdminAccounts().subscribe((res) => {
      expect(res.total).toBe(1);
    });
  });

  it('should invite new admin', () => {
    service
      .inviteAdmin({ email: 'new@ceylongo.lk', full_name: 'New', role: 'admin' })
      .subscribe((res) => {
        expect(res.id).toBe(2);
      });
  });
});
