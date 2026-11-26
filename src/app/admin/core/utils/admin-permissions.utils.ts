/**
 * Phase 02 RBAC & Permission Utilities
 * Enforces the verified permissions matrix from admin_frontend_phase_02_rbac_permission_matrix.md
 */

import { AdminUser } from '../models/admin-auth.models';

export const APPROVED_ADMIN_ROLES = [
  'super_admin',
  'operations_admin',
  'finance_admin',
  'content_moderator',
  'support_admin',
] as const;

export type CanonicalAdminRole = (typeof APPROVED_ADMIN_ROLES)[number];

/**
 * Resolves an administrative user's role to a canonical admin role identifier.
 * Follows backend app/core/admin_roles.py: maps legacy 'admin' to 'super_admin'.
 */
export function resolveCanonicalRole(user: AdminUser | null): CanonicalAdminRole | null {
  if (!user) return null;
  const rawRole = (user.admin_role || user.role || '').trim().toLowerCase();
  if (rawRole === 'admin' || rawRole === 'super_admin') {
    return 'super_admin';
  }
  if (rawRole === 'operations_admin') return 'operations_admin';
  if (rawRole === 'finance_admin') return 'finance_admin';
  if (rawRole === 'content_moderator') return 'content_moderator';
  if (rawRole === 'support_admin') return 'support_admin';
  return null;
}

/**
 * Returns true if the user has Super Admin authority (or legacy admin).
 */
export function isSuperAdminUser(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) === 'super_admin';
}

/**
 * Returns true if the user is authorized to read traveler directory and details.
 * Backend: require_operations_or_support_read (super_admin, operations_admin, support_admin).
 */
export function canViewTravelers(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin' || role === 'support_admin';
}

/**
 * Returns true if the user is authorized to suspend or reactivate a traveler account.
 * Backend: require_super_admin (strictly super_admin only).
 * Operational Admin receives HTTP 403 Forbidden on the backend.
 */
export function canModifyTravelerStatus(user: AdminUser | null): boolean {
  return isSuperAdminUser(user);
}

/**
 * Returns an explanatory tooltip notice when a user lacks permission to modify traveler status.
 */
export function getTravelerStatusPermissionMessage(user: AdminUser | null): string | null {
  if (canModifyTravelerStatus(user)) {
    return null;
  }
  return 'Super Admin authorization required to suspend or reactivate traveler accounts.';
}

/**
 * Returns true if the user is authorized to view service provider directory and details.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canViewProviders(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to review verification applications and stream identity documents.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canReviewVerifications(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to view homestay listings, queues, and details.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canViewHomestays(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to review, approve, reject, or suspend a homestay listing.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canReviewHomestays(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to verify homestay status.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canVerifyHomestays(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to view adventure activities.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canViewActivities(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to approve or reject adventure activities.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canReviewActivities(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to view rental vehicles and queues.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canViewRentals(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to approve, reject, or suspend rental vehicle listings.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canReviewRentals(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to inspect and verify rental vehicle documents.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canVerifyRentalDocuments(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to view module administrative financial summaries.
 * Backend: require_operations_or_finance_admin (super_admin, operations_admin, finance_admin).
 */
export function canViewFinancialMetrics(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin' || role === 'finance_admin';
}

/**
 * Returns true if the user is authorized to view tour guide directory, profiles, and credentials.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canViewTourGuides(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to approve, reject, suspend, or reinstate tour guides.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canReviewTourGuides(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to verify tour guide credentials and update badges.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canVerifyGuideCredentials(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to view artisan businesses and showcase products.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canViewArtisans(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to approve, reject, suspend, or feature artisan listings and products.
 * Backend: require_operations_admin (super_admin, operations_admin).
 */
export function canReviewArtisans(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin';
}

/**
 * Returns true if the user is authorized to moderate artisan customer reviews (publish/hide).
 * Backend: require_content_moderator (super_admin, operations_admin, content_moderator).
 */
export function canModerateArtisanReviews(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin' || role === 'content_moderator';
}

/**
 * Returns true if the user is authorized to view booking directory and detail dossiers.
 * Backend: require_operations_or_support_read (super_admin, operations_admin, support_admin, finance_admin).
 */
export function canViewBookings(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return (
    role === 'super_admin' ||
    role === 'operations_admin' ||
    role === 'support_admin' ||
    role === 'finance_admin'
  );
}

/**
 * Module 12: Payments & Refunds
 * Backend: require_finance_admin (super_admin, finance_admin).
 */
export function canViewPayments(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'finance_admin';
}

export function canManageFinances(user: AdminUser | null): boolean {
  return canViewPayments(user);
}

/**
 * Module 13: Community Management
 * Backend: require_content_moderator (super_admin, content_moderator).
 */
export function canViewCommunity(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'content_moderator' || role === 'operations_admin';
}

export function canModerateCommunity(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'content_moderator';
}

/**
 * Module 14: Reports & Analytics
 * Backend: require_operations_or_finance_admin (super_admin, operations_admin, finance_admin).
 */
export function canViewReports(user: AdminUser | null): boolean {
  const role = resolveCanonicalRole(user);
  return role === 'super_admin' || role === 'operations_admin' || role === 'finance_admin';
}

/**
 * Module 16: Admin Management & Invitations
 * Backend: require_super_admin (strictly super_admin only).
 */
export function canManageAdmins(user: AdminUser | null): boolean {
  return isSuperAdminUser(user);
}

/**
 * Module 17: Audit Logs
 * Backend: require_super_admin (strictly super_admin only).
 */
export function canViewAuditLogs(user: AdminUser | null): boolean {
  return isSuperAdminUser(user);
}

/**
 * Module 18: System Settings
 * Backend: require_super_admin (strictly super_admin only).
 */
export function canManageSystemSettings(user: AdminUser | null): boolean {
  return isSuperAdminUser(user);
}
