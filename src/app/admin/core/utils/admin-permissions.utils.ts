import { AdminRole, AdminUser } from '../models/admin-auth.models';

export const APPROVED_ADMIN_ROLES = ['admin', 'super_admin'] as const;

export type CanonicalAdminRole = AdminRole;

export function resolveCanonicalRole(user: AdminUser | null): CanonicalAdminRole | null {
  if (!user?.is_active) return null;
  const role = user.role;
  if (role !== user.admin_role) return null;
  return role === 'admin' || role === 'super_admin' ? role : null;
}

export function isSuperAdminUser(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) === 'super_admin';
}

/**
 * Returns true if the user is authorized to read traveler directory and details.
 */
export function canViewTravelers(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to suspend or reactivate a traveler account.
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
 */
export function canViewProviders(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to review verification applications and stream identity documents.
 */
export function canReviewVerifications(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to view homestay listings, queues, and details.
 */
export function canViewHomestays(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to review, approve, reject, or suspend a homestay listing.
 */
export function canReviewHomestays(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to verify homestay status.
 */
export function canVerifyHomestays(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to view adventure activities.
 */
export function canViewActivities(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to approve or reject adventure activities.
 */
export function canReviewActivities(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to view rental vehicles and queues.
 */
export function canViewRentals(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to approve, reject, or suspend rental vehicle listings.
 */
export function canReviewRentals(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to inspect and verify rental vehicle documents.
 */
export function canVerifyRentalDocuments(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to view module administrative financial summaries.
 */
export function canViewFinancialMetrics(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to view tour guide directory, profiles, and credentials.
 */
export function canViewTourGuides(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to approve, reject, suspend, or reinstate tour guides.
 */
export function canReviewTourGuides(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to verify tour guide credentials and update badges.
 */
export function canVerifyGuideCredentials(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to view artisan businesses and showcase products.
 */
export function canViewArtisans(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to approve, reject, suspend, or feature artisan listings and products.
 */
export function canReviewArtisans(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to moderate artisan customer reviews (publish/hide).
 */
export function canModerateArtisanReviews(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Returns true if the user is authorized to view booking directory and detail dossiers.
 */
export function canViewBookings(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Module 12: Payments & Refunds
 */
export function canViewPayments(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

export function canManageFinances(user: AdminUser | null): boolean {
  return canViewPayments(user);
}

/**
 * Module 13: Community Management
 */
export function canViewCommunity(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

export function canModerateCommunity(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Module 14: Reports & Analytics
 */
export function canViewReports(user: AdminUser | null): boolean {
  return resolveCanonicalRole(user) !== null;
}

/**
 * Module 16: Admin Management & Invitations
 */
export function canManageAdmins(user: AdminUser | null): boolean {
  return isSuperAdminUser(user);
}

/**
 * Module 17: Audit Logs
 */
export function canViewAuditLogs(user: AdminUser | null): boolean {
  return isSuperAdminUser(user);
}

/**
 * Module 18: System Settings
 */
export function canManageSystemSettings(user: AdminUser | null): boolean {
  return isSuperAdminUser(user);
}
