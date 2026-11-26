import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../../environments/environment';
import { AdminUser } from '../models/admin-auth.models';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminPreviewStateService } from './admin-preview-state.service';

describe('AdminPreviewStateService', () => {
  let service: AdminPreviewStateService;

  const superAdminUser: AdminUser = {
    id: 1,
    full_name: 'Super Admin',
    email: 'super@ceylongo.com',
    role: 'super_admin',
    admin_role: 'super_admin',
    is_active: true,
  };

  const opsAdminUser: AdminUser = {
    id: 2,
    full_name: 'Ops Admin',
    email: 'ops@ceylongo.com',
    role: 'operations_admin',
    admin_role: 'operations_admin',
    is_active: true,
  };

  // Mock AdminAuthService with controllable demo and authenticated states
  let mockIsAuthenticated = true;
  let mockIsDemoSession = true;
  let mockCurrentUser: AdminUser | null = superAdminUser;

  const mockAdminAuthService = {
    isAuthenticated: () => mockIsAuthenticated,
    isDemoSession: () => mockIsDemoSession,
    currentUser: () => mockCurrentUser,
    currentToken: () => (mockIsAuthenticated ? 'demo-token-123' : null),
    logout: () => {
      mockIsAuthenticated = false;
      mockIsDemoSession = false;
      mockCurrentUser = null;
    },
  };

  beforeEach(() => {
    mockIsAuthenticated = true;
    mockIsDemoSession = true;
    mockCurrentUser = superAdminUser;

    TestBed.configureTestingModule({
      providers: [
        AdminPreviewStateService,
        { provide: AdminAuthService, useValue: mockAdminAuthService },
      ],
    });
    service = TestBed.inject(AdminPreviewStateService);
    service.resetState();
  });

  describe('Initialization & Fixture Integrity', () => {
    it('should initialize with exactly 8 deterministic travelers and 8 providers', () => {
      const travelers = service.getTravelers();
      expect(travelers.total).toBe(8);
      expect(travelers.items.length).toBe(8);

      const providers = service.getProviders();
      expect(providers.total).toBe(8);
      expect(providers.items.length).toBe(8);
    });

    it('should reset state cleanly to initial fixtures', () => {
      // Modify traveler #1
      service.updateTravelerStatus(1, {
        is_active: false,
        reason_code: 'policy_violation',
        note: 'Temporary suspension for test',
      }, superAdminUser);
      expect(service.getTraveler(1)?.is_active).toBe(false);

      // Reset
      service.resetState();
      expect(service.getTraveler(1)?.is_active).toBe(true);
    });
  });

  describe('Module 03: Traveler Management Handlers', () => {
    it('should filter travelers by search keyword (name or email)', () => {
      const resName = service.getTravelers({ search: 'Kavindu' });
      expect(resName.total).toBe(1);
      expect(resName.items[0].full_name).toBe('Kavindu Perera');

      const resEmail = service.getTravelers({ search: 'example.com' });
      expect(resEmail.total).toBe(8);
    });

    it('should filter travelers by is_active status', () => {
      const active = service.getTravelers({ is_active: true });
      expect(active.total).toBe(6);

      const suspended = service.getTravelers({ is_active: false });
      expect(suspended.total).toBe(2);
    });

    it('should paginate traveler results correctly', () => {
      const page1 = service.getTravelers({ page: 1, page_size: 3 });
      expect(page1.items.length).toBe(3);
      expect(page1.total_pages).toBe(3);
      expect(page1.items[0].id).toBe(1);

      const page2 = service.getTravelers({ page: 2, page_size: 3 });
      expect(page2.items.length).toBe(3);
      expect(page2.items[0].id).toBe(4);
    });

    it('should retrieve traveler details and status history', () => {
      const traveler = service.getTraveler(3);
      expect(traveler).toBeTruthy();
      expect(traveler?.full_name).toBe("Liam O'Connor");
      expect(traveler?.is_active).toBe(false);

      const history = service.getTravelerHistory(3);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].reason_code).toBe('policy_violation');
    });

    it('should enforce Super Admin authorization derived from session on traveler status updates', () => {
      // Set session to Operational Admin
      mockCurrentUser = opsAdminUser;

      // Even if caller passes superAdminUser or anything else, session is Ops Admin -> must throw 403 Forbidden
      expect(() => {
        service.updateTravelerStatus(1, {
          is_active: false,
          reason_code: 'policy_violation',
          note: 'Suspended by ops admin',
        }, superAdminUser);
      }).toThrowError(/HTTP 403 Forbidden/);
    });

    it('should automatically reset preview state on session replacement or role change', () => {
      // Modify state as Super Admin
      mockCurrentUser = superAdminUser;
      service.updateTravelerStatus(1, {
        is_active: false,
        reason_code: 'policy_violation',
        note: 'State modified before session switch',
      });
      expect(service.getTraveler(1)?.is_active).toBe(false);

      // Switch session to another user/role
      mockCurrentUser = opsAdminUser;
      // Accessing preview state detects session key change and resets state
      const travelerAfterSwitch = service.getTraveler(1);
      expect(travelerAfterSwitch?.is_active).toBe(true);
    });

    it('should allow Super Admin to update traveler status with valid reason and record history', () => {
      const updated = service.updateTravelerStatus(1, {
        is_active: false,
        reason_code: 'fraud_suspected',
        note: 'Payment fraud alert flagged by risk engine.',
      }, superAdminUser);

      expect(updated.is_active).toBe(false);

      const history = service.getTravelerHistory(1);
      expect(history.length).toBe(1);
      expect(history[0].is_active).toBe(false);
      expect(history[0].previous_is_active).toBe(true);
      expect(history[0].reason_code).toBe('fraud_suspected');
      expect(history[0].note).toContain('Payment fraud alert');
    });

    it('should reject traveler status update with invalid reason or empty note', () => {
      // Reactivation reason used for deactivation
      expect(() => {
        service.updateTravelerStatus(1, {
          is_active: false,
          reason_code: 'appeal_approved',
          note: 'Invalid reason test',
        }, superAdminUser);
      }).toThrowError(/HTTP 422/);

      // Empty note
      expect(() => {
        service.updateTravelerStatus(1, {
          is_active: false,
          reason_code: 'policy_violation',
          note: '   ',
        }, superAdminUser);
      }).toThrowError(/HTTP 422/);
    });
  });

  describe('Module 04: Provider Management Handlers', () => {
    it('should filter providers by approval status, category, and search term', () => {
      const pending = service.getProviders({ status: 'pending' });
      expect(pending.total).toBe(3);

      const approved = service.getProviders({ status: 'approved' });
      expect(approved.total).toBe(4);

      const rejected = service.getProviders({ status: 'rejected' });
      expect(rejected.total).toBe(1);

      const homestays = service.getProviders({ category: 'homestay' });
      expect(homestays.total).toBe(1);

      const searched = service.getProviders({ search: 'Kandy Serenity' });
      expect(searched.total).toBe(1);
      expect(searched.items[0].business_name).toBe('Kandy Serenity Homestay');
    });

    it('should retrieve full provider details with safe document flags', () => {
      const provider = service.getProvider(1);
      expect(provider).toBeTruthy();
      expect(provider?.business_name).toBe('Kandy Serenity Homestay');
      expect(provider?.selfie_uploaded).toBe(true);
      expect(provider?.nic_front_uploaded).toBe(true);
      expect(provider?.nic_back_uploaded).toBe(true);
      expect((provider as unknown as Record<string, unknown>)['selfie_image_path']).toBeUndefined();
    });
  });

  describe('Module 05: Verification Management Handlers', () => {
    it('should return only pending provider applications in verification queue', () => {
      const queue = service.getVerificationQueue();
      expect(queue.length).toBe(3);
      expect(queue.every((item) => item.approval_status === 'pending')).toBe(true);
    });

    it('should approve pending provider application and record reviewer metadata', () => {
      mockCurrentUser = opsAdminUser;
      const res = service.approveProvider(2, opsAdminUser);
      expect(res.success).toBe(true);
      expect(res.approval_status).toBe('approved');

      const updated = service.getProvider(2);
      expect(updated?.approval_status).toBe('approved');
      expect(updated?.reviewed_by).toBe(opsAdminUser.id);
      expect(updated?.reviewer_name).toBe(opsAdminUser.full_name);
    });

    it('should reject already approved or rejected provider from repeated approval', () => {
      expect(() => {
        service.approveProvider(1, opsAdminUser);
      }).toThrowError(/HTTP 400 Bad Request.*already approved/);

      expect(() => {
        service.approveProvider(5, opsAdminUser);
      }).toThrowError(/HTTP 400 Bad Request.*rejected/);
    });

    it('should reject pending provider application with valid mandatory reason', () => {
      const res = service.rejectProvider(3, {
        reason: 'National identity card images are blurred and registration number is unverified.',
      }, opsAdminUser);

      expect(res.success).toBe(true);
      expect(res.approval_status).toBe('rejected');
      expect(res.rejection_reason).toContain('National identity card images are blurred');

      const updated = service.getProvider(3);
      expect(updated?.approval_status).toBe('rejected');
      expect(updated?.rejection_reason).toContain('National identity card images are blurred');
    });

    it('should reject rejection request if reason is under 5 characters', () => {
      expect(() => {
        service.rejectProvider(4, { reason: 'No' }, opsAdminUser);
      }).toThrowError(/HTTP 422.*between 5 and 500 characters/);
    });

    it('should generate safe SVG preview data URI for documents', () => {
      const selfieUrl = service.getIdentityDocumentPreview(1, 'selfie');
      expect(selfieUrl.startsWith('data:image/svg+xml;utf8,')).toBe(true);
      expect(decodeURIComponent(selfieUrl)).toContain('DEMO PREVIEW DOCUMENT');
      expect(decodeURIComponent(selfieUrl)).toContain('LIVE SELFIE');
    });
  });

  describe('Module 06: Homestay Management Handlers', () => {
    it('should initialize with exactly 8 deterministic homestays', () => {
      const res = service.getHomestays();
      expect(res.total).toBe(8);
      expect(res.items.length).toBe(8);
    });

    it('should filter homestays by approval status', () => {
      const pending = service.getHomestays({ status: 'pending' });
      expect(pending.total).toBe(3);

      const approved = service.getHomestays({ status: 'approved' });
      expect(approved.total).toBe(3);

      const suspended = service.getHomestays({ status: 'suspended' });
      expect(suspended.total).toBe(1);

      const rejected = service.getHomestays({ status: 'rejected' });
      expect(rejected.total).toBe(1);
    });

    it('should filter homestays by verification status across all 4 statuses', () => {
      const verified = service.getHomestays({ verification_status: 'verified' });
      expect(verified.total).toBe(4);
      expect(verified.items.every((h) => h.verification_status === 'verified')).toBe(true);

      const unverified = service.getHomestays({ verification_status: 'unverified' });
      expect(unverified.total).toBe(2);
      expect(unverified.items.every((h) => h.verification_status === 'unverified')).toBe(true);

      const pending = service.getHomestays({ verification_status: 'pending' });
      expect(pending.total).toBe(1);
      expect(pending.items[0].name).toContain('Ella Cloud View Cottage');

      const rejected = service.getHomestays({ verification_status: 'rejected' });
      expect(rejected.total).toBe(1);
      expect(rejected.items[0].name).toContain('Sigiriya Ancient Garden Homestay');
    });

    it('should support combined AND filtering across search, district, status, and verification', () => {
      const combined = service.getHomestays({
        search: 'Lakeside',
        district: 'Kandy',
        status: 'approved',
        verification_status: 'verified',
      });
      expect(combined.total).toBe(1);
      expect(combined.items[0].id).toBe(2);
      expect(combined.items[0].name).toContain('Kandy Lakeside');
    });

    it('should return empty results gracefully for unpopulated districts', () => {
      const jaffna = service.getHomestays({ district: 'Jaffna' });
      expect(jaffna.total).toBe(0);
      expect(jaffna.items).toEqual([]);
      expect(jaffna.total_pages).toBe(1);

      const mullaitivu = service.getHomestays({ district: 'Mullaitivu' });
      expect(mullaitivu.total).toBe(0);
      expect(mullaitivu.items).toEqual([]);
    });

    it('should filter homestays by province and dependent district', () => {
      const central = service.getHomestays({ province: 'Central' });
      expect(central.total).toBe(4); // Kandy (2), Sigiriya/Matale (5), Nuwara Eliya (6), Knuckles/Matale (7)
      expect(central.items.every((h) => h.province === 'Central')).toBe(true);

      const centralKandy = service.getHomestays({ province: 'Central', district: 'Kandy' });
      expect(centralKandy.total).toBe(1);
      expect(centralKandy.items[0].name).toContain('Kandy Lakeside');

      const uva = service.getHomestays({ province: 'Uva' });
      expect(uva.total).toBe(1);
      expect(uva.items[0].name).toContain('Ella Cloud View');

      const northern = service.getHomestays({ province: 'Northern' });
      expect(northern.total).toBe(0);
      expect(northern.items).toEqual([]);
    });

    it('should filter homestays by district and search term', () => {
      const badulla = service.getHomestays({ district: 'Badulla' });
      expect(badulla.total).toBe(1);
      expect(badulla.items[0].name).toContain('Ella Cloud View');

      const search = service.getHomestays({ search: 'Galle Fort' });
      expect(search.total).toBe(1);
    });

    it('should approve homestay and set is_active to true', () => {
      const updated = service.reviewHomestay(1, { decision: 'approved' }, opsAdminUser);
      expect(updated.approval_status).toBe('approved');
      expect(updated.is_active).toBe(true);
      expect(updated.reviewed_by).toBe(opsAdminUser.id);
    });

    it('should reject homestay with mandatory reason (min 5 chars)', () => {
      expect(() => {
        service.reviewHomestay(1, { decision: 'rejected', reason: 'No' }, opsAdminUser);
      }).toThrowError(/at least 5 characters/);

      const updated = service.reviewHomestay(1, { decision: 'rejected', reason: 'Property photos are inadequate' }, opsAdminUser);
      expect(updated.approval_status).toBe('rejected');
      expect(updated.is_active).toBe(false);
      expect(updated.rejection_reason).toBe('Property photos are inadequate');
    });

    it('should verify homestay verification status independently of approval status', () => {
      const initialApproval = service.getHomestay(1)?.approval_status;
      const verified = service.verifyHomestay(1, { verification_status: 'verified' }, opsAdminUser);
      expect(verified.verification_status).toBe('verified');
      expect(verified.approval_status).toBe(initialApproval);
    });

    it('should suspend homestay listing without corrupting verification status', () => {
      // Homestay #2 is verified
      const initialVerification = service.getHomestay(2)?.verification_status;
      expect(initialVerification).toBe('verified');

      const suspended = service.reviewHomestay(2, { decision: 'suspended', reason: 'Safety review pending' }, opsAdminUser);
      expect(suspended.approval_status).toBe('suspended');
      expect(suspended.is_active).toBe(false);
      expect(suspended.verification_status).toBe('verified'); // Verification status preserved
    });

    it('should reject invalid verification status like suspended with HTTP 400', () => {
      expect(() => {
        service.verifyHomestay(1, { verification_status: 'suspended' as any }, opsAdminUser);
      }).toThrowError(/HTTP 400 Bad Request: Invalid verification status/);
    });

    it('should calculate live homestay dashboard metrics matching current state', () => {
      const dash = service.getHomestayDashboard();
      expect(dash.listings.total).toBe(8);
      expect(dash.listings.approved).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Module 07: Adventure Activities Handlers', () => {
    it('should initialize with exactly 8 deterministic activities', () => {
      const res = service.getActivities();
      expect(res.total).toBe(8);
      expect(res.items.length).toBe(8);
    });

    it('should filter activities by category and search keyword', () => {
      const surfing = service.getActivities({ category: 'surfing' });
      expect(surfing.total).toBe(2);

      const search = service.getActivities({ search: 'White Water Rafting' });
      expect(search.total).toBe(1);
      expect(search.items[0].category).toBe('rafting');
    });

    it('should approve pending activity', () => {
      const approved = service.approveActivity(1, { notes: 'Safety gear inspected' }, opsAdminUser);
      expect(approved.approval_status).toBe('approved');
      expect(approved.is_active).toBe(true);
      expect(approved.reviewed_by).toBe(opsAdminUser.id);
    });

    it('should reject approval on non-pending activity with HTTP 409 Conflict', () => {
      expect(() => {
        service.approveActivity(2, undefined, opsAdminUser); // Activity #2 is already approved
      }).toThrowError(/HTTP 409 Conflict: Only pending activities can be approved/);
    });

    it('should reject pending activity with mandatory reason', () => {
      expect(() => {
        service.rejectActivity(4, { reason: 'Bad' }, opsAdminUser);
      }).toThrowError(/at least 5 characters/);

      const rejected = service.rejectActivity(4, { reason: 'Safari vehicle safety inspection certificate expired' }, opsAdminUser);
      expect(rejected.approval_status).toBe('rejected');
      expect(rejected.is_active).toBe(false);
      expect(rejected.rejection_reason).toContain('safety inspection certificate expired');
    });
  });

  describe('Module 08: Bike and Bicycle Rental Handlers', () => {
    it('should initialize with exactly 8 deterministic vehicles', () => {
      const res = service.getRentals();
      expect(res.total).toBe(8);
      expect(res.items.length).toBe(8);
    });

    it('should filter rentals by vehicle type (bike, bicycle, tuk_tuk)', () => {
      const bikes = service.getRentals({ vehicle_type: 'bike' });
      expect(bikes.total).toBe(4);

      const bicycles = service.getRentals({ vehicle_type: 'bicycle' });
      expect(bicycles.total).toBe(3);

      const tuktuks = service.getRentals({ vehicle_type: 'tuk_tuk' });
      expect(tuktuks.total).toBe(1);
    });

    it('should enforce verified revenue license and insurance before approving motorized bike', () => {
      // Vehicle #1 is a motorized bike with unverified documents
      expect(() => {
        service.reviewRental(1, { decision: 'approved' }, opsAdminUser);
      }).toThrowError(/Cannot approve motorized vehicle listing: verified revenue_license and insurance_certificate documents are required/);

      // Verify the documents first
      service.verifyRentalDocument(1, 101, true, 'Revenue license verified', opsAdminUser);
      service.verifyRentalDocument(1, 102, true, 'Insurance verified', opsAdminUser);

      // Now approve should succeed
      const res = service.reviewRental(1, { decision: 'approved' }, opsAdminUser);
      expect(res.success).toBe(true);
      expect(res.approval_status).toBe('approved');
    });

    it('should approve bicycle rentals without requiring motor vehicle road licenses or insurance', () => {
      // Vehicle #4 is a bicycle with 0 motor licensing documents
      const res = service.reviewRental(4, { decision: 'approved' }, opsAdminUser);
      expect(res.success).toBe(true);
      expect(res.approval_status).toBe('approved');
    });

    it('should reject rental vehicle with mandatory reason', () => {
      expect(() => {
        service.reviewRental(6, { decision: 'rejected', reason: 'No' }, opsAdminUser);
      }).toThrowError(/at least 5 characters/);

      const res = service.reviewRental(6, { decision: 'rejected', reason: 'Odometer reading mismatch and damaged indicators' }, opsAdminUser);
      expect(res.success).toBe(true);
      expect(res.approval_status).toBe('rejected');
    });

    it('should update vehicle verification status via verifyRentalStatus', () => {
      const res = service.verifyRentalStatus(1, { verification_status: 'verified' }, opsAdminUser);
      expect(res.success).toBe(true);
      expect(res.verification_status).toBe('verified');
    });

    it('should compute live fleet summary KPIs', () => {
      const summary = service.getRentalFleetSummary();
      expect(summary.total_vehicles).toBe(8);
      expect(summary.total_providers).toBe(2);
    });
  });

  describe('RBAC & Listing Independence Security Controls', () => {
    const supportUser: AdminUser = {
      id: 99,
      full_name: 'Support Clerk',
      email: 'clerk@ceylongo.com',
      role: 'support_admin',
      admin_role: 'support_admin',
      is_active: true,
    };

    it('should reject unauthorized mutations from support_admin with HTTP 403 Forbidden', () => {
      expect(() => {
        service.reviewHomestay(1, { decision: 'approved' }, supportUser);
      }).toThrowError(/HTTP 403 Forbidden/);

      expect(() => {
        service.approveActivity(1, undefined, supportUser);
      }).toThrowError(/HTTP 403 Forbidden/);

      expect(() => {
        service.reviewRental(3, { decision: 'approved' }, supportUser);
      }).toThrowError(/HTTP 403 Forbidden/);
    });

    it('should maintain strict independence: approving a listing does not approve the provider', () => {
      // Provider #1 in mock providers
      const initialProvider = service.getProvider(1);
      const initialApproval = initialProvider?.approval_status;

      // Approve Homestay #1 (owned by Provider #1)
      service.reviewHomestay(1, { decision: 'approved' }, opsAdminUser);

      // Verify that provider's approval status was untouched
      const providerAfter = service.getProvider(1);
      expect(providerAfter?.approval_status).toBe(initialApproval);
    });

    it('should reject preview state access if user is unauthenticated', () => {
      mockIsAuthenticated = false;
      expect(() => {
        service.getTravelers();
      }).toThrowError(/HTTP 401 Unauthorized/);
    });

    it('should reject preview state access if user is a real authenticated user in development', () => {
      mockIsAuthenticated = true;
      mockIsDemoSession = false; // Real live session
      expect(() => {
        service.getTravelers();
      }).toThrowError(/HTTP 403 Forbidden: Real authenticated users cannot access or mutate local preview demo state/);
    });

    it('should throw an error on instantiation or access if environment.production is true', () => {
      const origProd = environment.production;
      try {
        (environment as { production: boolean }).production = true;
        expect(() => {
          service.getTravelers();
        }).toThrowError(/strictly forbidden in production/);
      } finally {
        (environment as { production: boolean }).production = origProd;
      }
    });
  });
});
