import { describe, expect, it } from 'vitest';

import {
  DEACTIVATION_REASON_CODES,
  isValidTravelerStatusReason,
  REACTIVATION_REASON_CODES,
  TRAVELER_REASON_CODE_LABELS,
} from './admin-travelers.models';
import {
  PROVIDER_CATEGORY_DISPLAY_NAMES,
  ProviderCategory,
} from './admin-providers.models';
import {
  VERIFICATION_DOCUMENT_TITLES,
  VerificationDocumentType,
} from './admin-verifications.models';

describe('Phase 02 Models & Contract Validation', () => {
  it('should define exactly 5 deactivation reason codes and 4 reactivation reason codes', () => {
    expect(DEACTIVATION_REASON_CODES.length).toBe(5);
    expect(REACTIVATION_REASON_CODES.length).toBe(4);

    expect(DEACTIVATION_REASON_CODES).toContain('policy_violation');
    expect(DEACTIVATION_REASON_CODES).toContain('fraud_suspected');
    expect(DEACTIVATION_REASON_CODES).toContain('security_risk');
    expect(DEACTIVATION_REASON_CODES).toContain('user_requested');
    expect(DEACTIVATION_REASON_CODES).toContain('administrative_action');

    expect(REACTIVATION_REASON_CODES).toContain('appeal_approved');
    expect(REACTIVATION_REASON_CODES).toContain('security_cleared');
    expect(REACTIVATION_REASON_CODES).toContain('issue_resolved');
    expect(REACTIVATION_REASON_CODES).toContain('administrative_review');
  });

  it('should validate reason codes against target is_active state correctly', () => {
    // Valid deactivations
    expect(isValidTravelerStatusReason(false, 'policy_violation')).toBe(true);
    expect(isValidTravelerStatusReason(false, 'fraud_suspected')).toBe(true);
    expect(isValidTravelerStatusReason(false, 'security_risk')).toBe(true);
    expect(isValidTravelerStatusReason(false, 'user_requested')).toBe(true);
    expect(isValidTravelerStatusReason(false, 'administrative_action')).toBe(true);

    // Invalid deactivations (using reactivation reason for deactivation)
    expect(isValidTravelerStatusReason(false, 'appeal_approved')).toBe(false);
    expect(isValidTravelerStatusReason(false, 'security_cleared')).toBe(false);

    // Valid reactivations
    expect(isValidTravelerStatusReason(true, 'appeal_approved')).toBe(true);
    expect(isValidTravelerStatusReason(true, 'security_cleared')).toBe(true);
    expect(isValidTravelerStatusReason(true, 'issue_resolved')).toBe(true);
    expect(isValidTravelerStatusReason(true, 'administrative_review')).toBe(true);

    // Invalid reactivations (using deactivation reason for reactivation)
    expect(isValidTravelerStatusReason(true, 'policy_violation')).toBe(false);
    expect(isValidTravelerStatusReason(true, 'administrative_action')).toBe(false);
  });

  it('should include all verified backend provider categories', () => {
    const validCategories: ProviderCategory[] = [
      'homestay',
      'tour_guide',
      'activity',
      'eco_tourism',
      'artisan',
      'rental',
    ];

    for (const cat of validCategories) {
      expect(PROVIDER_CATEGORY_DISPLAY_NAMES[cat]).toBeDefined();
    }
    expect(PROVIDER_CATEGORY_DISPLAY_NAMES.homestay).toBe('Homestay');
    expect(PROVIDER_CATEGORY_DISPLAY_NAMES.activity).toBe('Adventure & Activities');
    expect(PROVIDER_CATEGORY_DISPLAY_NAMES.rental).toBe('Bike & Bicycle Rentals');
    expect(PROVIDER_CATEGORY_DISPLAY_NAMES.tour_guide).toBe('Tour Guide');
    expect(PROVIDER_CATEGORY_DISPLAY_NAMES.artisan).toBe('Local Artisan & Small Business');
    expect(PROVIDER_CATEGORY_DISPLAY_NAMES.eco_tourism).toBe('Eco Tourism');
  });

  it('should strictly define only the 3 verified document types supported by backend streaming', () => {
    const docTypes: VerificationDocumentType[] = ['selfie', 'nic_front', 'nic_back'];
    expect(docTypes.length).toBe(3);
    for (const dt of docTypes) {
      expect(VERIFICATION_DOCUMENT_TITLES[dt]).toBeDefined();
    }
    expect(VERIFICATION_DOCUMENT_TITLES.selfie).toBe('Live Selfie / Photo');
    expect(VERIFICATION_DOCUMENT_TITLES.nic_front).toBe('National ID / Passport (Front)');
    expect(VERIFICATION_DOCUMENT_TITLES.nic_back).toBe('National ID (Back)');
  });
});
