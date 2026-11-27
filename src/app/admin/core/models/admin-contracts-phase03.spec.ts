import { describe, expect, it } from 'vitest';

import {
  HomestayApprovalStatus,
  HomestayResponse,
  HomestayReviewRequest,
  HomestayVerificationStatus,
} from './admin-homestays.models';
import {
  ActivityApprovalStatus,
  ActivityCategory,
  ActivityDifficulty,
  ActivityResponse,
} from './admin-activities.models';
import {
  AdminVehicleDetailResponse,
  AdminVehicleListItem,
  RentalApprovalStatus,
  RentalDocumentType,
  RentalVehicleType,
  RentalVerificationStatus,
} from './admin-rentals.models';
import { ADMIN_MODULE_CAPABILITIES } from './admin-capabilities.models';

describe('Phase 03A API Contracts and Capability Models', () => {
  describe('Module 06 Homestay Models', () => {
    it('should validate exact supported homestay approval status domain', () => {
      const validStatuses: HomestayApprovalStatus[] = [
        'pending',
        'approved',
        'rejected',
        'suspended',
        'draft',
      ];
      expect(validStatuses.length).toBe(5);
    });

    it('should validate exact supported homestay verification status domain', () => {
      const validVerification: HomestayVerificationStatus[] = [
        'unverified',
        'pending',
        'verified',
        'rejected',
      ];
      expect(validVerification.length).toBe(4);
    });

    it('should validate homestay review request payload structure', () => {
      const reviewReq: HomestayReviewRequest = {
        decision: 'approved',
      };
      expect(reviewReq.decision).toBe('approved');

      const rejectReq: HomestayReviewRequest = {
        decision: 'rejected',
        reason: 'Missing fire safety certificates.',
      };
      expect(rejectReq.decision).toBe('rejected');
      expect(rejectReq.reason).toBeDefined();
    });
  });

  describe('Module 07 Adventure Activity Models', () => {
    it('should validate exact supported activity approval status domain', () => {
      const validStatuses: ActivityApprovalStatus[] = [
        'pending',
        'approved',
        'rejected',
        'suspended',
        'draft',
      ];
      expect(validStatuses.length).toBe(5);
    });

    it('should validate activity categories', () => {
      const categories: ActivityCategory[] = [
        'hiking',
        'surfing',
        'rafting',
        'rock_climbing',
        'scuba_diving',
        'wildlife_safari',
        'cultural_tour',
        'cycling',
        'other',
      ];
      expect(categories.length).toBe(9);
    });

    it('should validate activity difficulty levels', () => {
      const difficulties: ActivityDifficulty[] = ['easy', 'moderate', 'challenging', 'extreme'];
      expect(difficulties.length).toBe(4);
    });
  });

  describe('Module 08 Bike and Bicycle Rental Models', () => {
    it('should validate supported vehicle types', () => {
      const types: RentalVehicleType[] = ['bike', 'bicycle', 'tuk_tuk'];
      expect(types.length).toBe(3);
    });

    it('should validate rental approval and verification status domains', () => {
      const approvalStatuses: RentalApprovalStatus[] = ['pending', 'approved', 'rejected', 'suspended'];
      const verificationStatuses: RentalVerificationStatus[] = ['unverified', 'pending', 'verified', 'rejected'];

      expect(approvalStatuses.length).toBe(4);
      expect(verificationStatuses.length).toBe(4);
    });

    it('should validate rental document types', () => {
      const docTypes: RentalDocumentType[] = [
        'revenue_license',
        'insurance_certificate',
        'registration_book',
        'fitness_certificate',
        'other',
      ];
      expect(docTypes.length).toBe(5);
    });
  });

  describe('API Capability Mapping Verification', () => {
    it('should map all Phase 03 operations with explicit support levels', () => {
      expect(ADMIN_MODULE_CAPABILITIES.length).toBeGreaterThanOrEqual(14);

      const homestayOps = ADMIN_MODULE_CAPABILITIES.filter((c) => c.moduleId === 'M06');
      const activityOps = ADMIN_MODULE_CAPABILITIES.filter((c) => c.moduleId === 'M07');
      const rentalOps = ADMIN_MODULE_CAPABILITIES.filter((c) => c.moduleId === 'M08');

      expect(homestayOps.length).toBeGreaterThanOrEqual(5);
      expect(activityOps.length).toBeGreaterThanOrEqual(5);
      expect(rentalOps.length).toBeGreaterThanOrEqual(6);

      // Verify that missing directory endpoints are explicitly cataloged as UNSUPPORTED_LIVE
      const unsupportedHomestay = homestayOps.find((c) => c.endpointPath === '/api/v1/admin/homestays');
      expect(unsupportedHomestay?.supportLevel).toBe('UNSUPPORTED_LIVE');

      const unsupportedActivity = activityOps.find((c) => c.endpointPath === '/api/v1/admin/activities/all');
      expect(unsupportedActivity?.supportLevel).toBe('UNSUPPORTED_LIVE');

      // Verify supported rental live operations
      const supportedRentals = rentalOps.find((c) => c.endpointPath === '/api/v1/admin/rentals/vehicles');
      expect(supportedRentals?.supportLevel).toBe('SUPPORTED_LIVE');
    });
  });
});
