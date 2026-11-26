import { describe, expect, it } from 'vitest';

import { AdminUser } from '../models/admin-auth.models';
import {
  canModifyTravelerStatus,
  canReviewActivities,
  canReviewHomestays,
  canReviewRentals,
  canReviewVerifications,
  canVerifyHomestays,
  canVerifyRentalDocuments,
  canViewActivities,
  canViewFinancialMetrics,
  canViewHomestays,
  canViewProviders,
  canViewRentals,
  canViewTravelers,
  getTravelerStatusPermissionMessage,
  isSuperAdminUser,
  resolveCanonicalRole,
} from './admin-permissions.utils';

describe('AdminPermissionsUtils', () => {
  const superAdminUser: AdminUser = {
    id: 1,
    full_name: 'Super Admin',
    email: 'super@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  };

  const legacyAdminUser: AdminUser = {
    id: 2,
    full_name: 'Legacy Admin',
    email: 'legacy@ceylongo.com',
    role: 'admin',
    admin_role: 'admin',
    is_active: true,
  };

  const operationsAdminUser: AdminUser = {
    id: 3,
    full_name: 'Ops Admin',
    email: 'ops@ceylongo.com',
    role: 'operations_admin',
    admin_role: 'operations_admin',
    is_active: true,
  };

  const financeAdminUser: AdminUser = {
    id: 4,
    full_name: 'Finance Admin',
    email: 'finance@ceylongo.com',
    role: 'finance_admin',
    admin_role: 'finance_admin',
    is_active: true,
  };

  const contentModeratorUser: AdminUser = {
    id: 5,
    full_name: 'Content Moderator',
    email: 'mod@ceylongo.com',
    role: 'content_moderator',
    admin_role: 'content_moderator',
    is_active: true,
  };

  const supportAdminUser: AdminUser = {
    id: 6,
    full_name: 'Support Admin',
    email: 'support@ceylongo.com',
    role: 'support_admin',
    admin_role: 'support_admin',
    is_active: true,
  };

  const travelerUser: AdminUser = {
    id: 99,
    full_name: 'Traveler Person',
    email: 'traveler@ceylongo.com',
    role: 'traveler',
    admin_role: '',
    is_active: true,
  };

  describe('resolveCanonicalRole', () => {
    it('should map legacy admin role to super_admin', () => {
      expect(resolveCanonicalRole(legacyAdminUser)).toBe('super_admin');
    });

    it('should preserve approved canonical admin roles', () => {
      expect(resolveCanonicalRole(superAdminUser)).toBe('super_admin');
      expect(resolveCanonicalRole(operationsAdminUser)).toBe('operations_admin');
      expect(resolveCanonicalRole(financeAdminUser)).toBe('finance_admin');
      expect(resolveCanonicalRole(contentModeratorUser)).toBe('content_moderator');
      expect(resolveCanonicalRole(supportAdminUser)).toBe('support_admin');
    });

    it('should return null for non-admin roles and null users', () => {
      expect(resolveCanonicalRole(travelerUser)).toBeNull();
      expect(resolveCanonicalRole(null)).toBeNull();
    });
  });

  describe('isSuperAdminUser', () => {
    it('should return true for super_admin and legacy admin', () => {
      expect(isSuperAdminUser(superAdminUser)).toBe(true);
      expect(isSuperAdminUser(legacyAdminUser)).toBe(true);
    });

    it('should return false for operational admin and non-admin', () => {
      expect(isSuperAdminUser(operationsAdminUser)).toBe(false);
      expect(isSuperAdminUser(supportAdminUser)).toBe(false);
      expect(isSuperAdminUser(travelerUser)).toBe(false);
      expect(isSuperAdminUser(null)).toBe(false);
    });
  });

  describe('Traveler Management Permissions', () => {
    it('should allow Super Admin, Operational Admin, and Support Admin to view travelers', () => {
      expect(canViewTravelers(superAdminUser)).toBe(true);
      expect(canViewTravelers(legacyAdminUser)).toBe(true);
      expect(canViewTravelers(operationsAdminUser)).toBe(true);
      expect(canViewTravelers(supportAdminUser)).toBe(true);
      expect(canViewTravelers(travelerUser)).toBe(false);
      expect(canViewTravelers(null)).toBe(false);
    });

    it('should restrict traveler status updates strictly to Super Admin', () => {
      expect(canModifyTravelerStatus(superAdminUser)).toBe(true);
      expect(canModifyTravelerStatus(legacyAdminUser)).toBe(true);
      expect(canModifyTravelerStatus(operationsAdminUser)).toBe(false);
      expect(canModifyTravelerStatus(supportAdminUser)).toBe(false);
      expect(canModifyTravelerStatus(travelerUser)).toBe(false);
      expect(canModifyTravelerStatus(null)).toBe(false);
    });

    it('should provide clear tooltip explanation when user cannot modify status', () => {
      expect(getTravelerStatusPermissionMessage(superAdminUser)).toBeNull();
      expect(getTravelerStatusPermissionMessage(operationsAdminUser)).toBe(
        'Super Admin authorization required to suspend or reactivate traveler accounts.'
      );
    });
  });

  describe('Provider and Verification Management Permissions', () => {
    it('should allow Super Admin and Operations Admin to view providers and review verifications', () => {
      expect(canViewProviders(superAdminUser)).toBe(true);
      expect(canViewProviders(operationsAdminUser)).toBe(true);
      expect(canViewProviders(supportAdminUser)).toBe(false);

      expect(canReviewVerifications(superAdminUser)).toBe(true);
      expect(canReviewVerifications(operationsAdminUser)).toBe(true);
      expect(canReviewVerifications(supportAdminUser)).toBe(false);
    });
  });

  describe('Phase 03 Listing & Operational Permissions', () => {
    it('should restrict Homestay operations to Super Admin and Operations Admin', () => {
      const allowed = [superAdminUser, legacyAdminUser, operationsAdminUser];
      const denied = [financeAdminUser, contentModeratorUser, supportAdminUser, travelerUser, null];

      allowed.forEach((u) => {
        expect(canViewHomestays(u)).toBe(true);
        expect(canReviewHomestays(u)).toBe(true);
        expect(canVerifyHomestays(u)).toBe(true);
      });

      denied.forEach((u) => {
        expect(canViewHomestays(u)).toBe(false);
        expect(canReviewHomestays(u)).toBe(false);
        expect(canVerifyHomestays(u)).toBe(false);
      });
    });

    it('should restrict Adventure Activity operations to Super Admin and Operations Admin', () => {
      const allowed = [superAdminUser, legacyAdminUser, operationsAdminUser];
      const denied = [financeAdminUser, contentModeratorUser, supportAdminUser, travelerUser, null];

      allowed.forEach((u) => {
        expect(canViewActivities(u)).toBe(true);
        expect(canReviewActivities(u)).toBe(true);
      });

      denied.forEach((u) => {
        expect(canViewActivities(u)).toBe(false);
        expect(canReviewActivities(u)).toBe(false);
      });
    });

    it('should restrict Rental Vehicle operations and document verification to Super Admin and Operations Admin', () => {
      const allowed = [superAdminUser, legacyAdminUser, operationsAdminUser];
      const denied = [financeAdminUser, contentModeratorUser, supportAdminUser, travelerUser, null];

      allowed.forEach((u) => {
        expect(canViewRentals(u)).toBe(true);
        expect(canReviewRentals(u)).toBe(true);
        expect(canVerifyRentalDocuments(u)).toBe(true);
      });

      denied.forEach((u) => {
        expect(canViewRentals(u)).toBe(false);
        expect(canReviewRentals(u)).toBe(false);
        expect(canVerifyRentalDocuments(u)).toBe(false);
      });
    });

    it('should allow Finance Admin along with Super Admin and Operations Admin to view financial metrics', () => {
      expect(canViewFinancialMetrics(superAdminUser)).toBe(true);
      expect(canViewFinancialMetrics(legacyAdminUser)).toBe(true);
      expect(canViewFinancialMetrics(operationsAdminUser)).toBe(true);
      expect(canViewFinancialMetrics(financeAdminUser)).toBe(true);

      expect(canViewFinancialMetrics(contentModeratorUser)).toBe(false);
      expect(canViewFinancialMetrics(supportAdminUser)).toBe(false);
      expect(canViewFinancialMetrics(travelerUser)).toBe(false);
      expect(canViewFinancialMetrics(null)).toBe(false);
    });
  });
});
