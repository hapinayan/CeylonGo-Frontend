import { describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import {
  canManageAdmins,
  canManageFinances,
  canReviewVerifications,
  canViewBookings,
  resolveCanonicalRole,
} from './admin-permissions.utils';

const admin: AdminUser = {
  id: 2,
  full_name: 'Admin',
  email: 'admin@example.test',
  role: 'admin',
  admin_role: 'admin',
  is_active: true,
};

describe('Academic MVP Admin permissions', () => {
  it('allows ordinary Admin operations and reserves account management for Super Admin', () => {
    expect(resolveCanonicalRole(admin)).toBe('admin');
    expect(canReviewVerifications(admin)).toBe(true);
    expect(canViewBookings(admin)).toBe(true);
    expect(canManageFinances(admin)).toBe(true);
    expect(canManageAdmins(admin)).toBe(false);
    expect(canManageAdmins({ ...admin, role: 'super_admin', admin_role: 'super_admin' })).toBe(true);
  });

  it('rejects mismatched, inactive, and unsupported roles', () => {
    expect(canManageAdmins({ ...admin, admin_role: 'super_admin' })).toBe(false);
    expect(canManageAdmins({
      ...admin, role: 'super_admin', admin_role: 'super_admin', is_active: false,
    })).toBe(false);
    for (const role of [
      'traveler', 'provider', 'operations_admin', 'finance_admin', 'content_moderator', 'support_admin',
    ]) {
      expect(resolveCanonicalRole({ ...admin, role, admin_role: role })).toBeNull();
    }
  });
});
