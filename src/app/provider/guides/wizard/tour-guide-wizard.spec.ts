import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewListing } from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { PREVIEW_LISTINGS, PREVIEW_SLOTS, PREVIEW_BOOKINGS } from '../../provider-preview.development';
import { ProviderPreviewService } from '../../provider-preview.service';
import { TourGuideWizard } from './tour-guide-wizard';

describe('TourGuideWizard Component', () => {
  const sampleGuideDraft: ReviewListing = {
    listing: {
      id: 41,
      provider_id: 10,
      category: 'guide',
      title: 'Existing Draft Guide',
      description: 'Short intro\n\nDetailed bio text.',
      district: 'Badulla',
      locality: 'Ella',
      latitude: '6.866700',
      longitude: '81.046600',
      price: '4500.00',
      currency: 'LKR',
      approval_status: 'draft',
      is_active: false,
      media: [{ id: 501, storage_key: 'p/501.jpg', sort_order: 0 }],
      units: [{ id: 23, label: 'Ella Heritage Walk', capacity: 6, is_active: true }],
      created_at: '2026-11-20T08:00:00Z',
    },
    verification_status: 'draft',
    submitted_at: null,
    decided_at: null,
    decision_reason: null,
    details: {
      province: 'Uva',
      address: 'Station Road, Ella',
      contact: 'SLTDA Licensed Guide',
      house_rules: 'Ella Station Main Gate',
      links: [],
      notes: 'SLTDA license #4412',
      files: [{ id: 'ev-1', kind: 'license', media_type: 'application/pdf' }],
      guide: {
        years_of_experience: 5,
        categories: ['cultural_heritage'],
        languages: [
          {
            language_code: 'en',
            language_name: 'English',
            proficiency_level: 'fluent',
            is_primary: true,
          },
        ],
        service_areas: [
          { province: 'Uva', district: 'Badulla', city: 'Ella', is_primary: true },
        ],
        cancellation_policy: 'Free 24h cancellation',
      },
    },
    homestay_metadata: null,
    rooms: [],
  };

  describe('Server-side single draft resumption & submission flow', () => {
    let component: TourGuideWizard;
    let fixture: ComponentFixture<TourGuideWizard>;
    let providerServiceMock: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(async () => {
      providerServiceMock = {
        getProviderListings: vi.fn().mockReturnValue(of([sampleGuideDraft])),
        createDraftListing: vi.fn(),
        getProviderListing: vi.fn().mockReturnValue(of(sampleGuideDraft)),
        updateListingDraft: vi.fn().mockReturnValue(of(sampleGuideDraft)),
        getGuidePackages: vi.fn().mockReturnValue(
          of([
            {
              id: 23,
              title: 'Ella Heritage Walk',
              description: 'Explore historical landmarks in Ella with a local guide.',
              itinerary: null,
              duration_hours: '2.00',
              pricing_type: 'per_group',
              price: '4500.00',
              currency: 'LKR',
              max_people: 6,
              included_services: 'Guide commentary',
              excluded_services: 'Tickets',
              meeting_point: 'Ella Station Main Gate',
              is_active: true,
            },
          ])
        ),
        createGuidePackage: vi.fn(),
        updateGuidePackage: vi.fn(),
        getAvailabilitySlots: vi.fn().mockReturnValue(of([])),
        getProviderBookings: vi.fn().mockReturnValue(of([])),
        getPhotoBlob: vi.fn().mockReturnValue(of(new Blob(['img'], { type: 'image/png' }))),
        saveEvidence: vi.fn().mockReturnValue(of(sampleGuideDraft)),
        submitListing: vi.fn().mockReturnValue(
          of({ ...sampleGuideDraft, verification_status: 'pending' })
        ),
      };

      await TestBed.configureTestingModule({
        imports: [TourGuideWizard],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ProviderService, useValue: providerServiceMock },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                paramMap: convertToParamMap({}),
                queryParamMap: convertToParamMap({}),
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(TourGuideWizard);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('resumes existing server draft without creating duplicate draft listings', () => {
      expect(providerServiceMock['getProviderListings']).toHaveBeenCalledWith(50, 0, 'guide');
      expect(providerServiceMock['createDraftListing']).not.toHaveBeenCalled();
      expect(component.listingId()).toBe(41);
      expect(component.guideName).toBe('Existing Draft Guide');
      expect(component.packages().length).toBe(1);
    });

    it('creates a new server draft only when no guide draft exists', () => {
      providerServiceMock['getProviderListings'].mockReturnValueOnce(of([]));
      providerServiceMock['createDraftListing'].mockReturnValueOnce(
        of({ ...sampleGuideDraft, listing: { ...sampleGuideDraft.listing, id: 88 } })
      );

      const secondFixture = TestBed.createComponent(TourGuideWizard);
      secondFixture.detectChanges();
      expect(providerServiceMock['createDraftListing']).toHaveBeenCalledWith('guide');
    });

    it('persists step updates and submits with qualification evidence + declaration', async () => {
      await component.nextStep();
      expect(providerServiceMock['updateListingDraft']).toHaveBeenCalled();
      expect(component.currentStep()).toBe(2);

      component.currentStep.set(6);
      component.declarationAccepted = true;
      await component.submitForVerification();
      expect(providerServiceMock['submitListing']).toHaveBeenCalledWith(41);
      expect(component.isSubmitted()).toBe(true);
    });
  });

  describe('Preview Mode isolation', () => {
    it('loads sample guide without API requests or submission mutations', async () => {
      const previewStub: Partial<ProviderPreviewService> = {
        isPreview: (() => true) as any,
        queryParams: (() => ({ preview: 'true' })) as any,
        sampleListings: PREVIEW_LISTINGS,
        sampleSlotsMap: PREVIEW_SLOTS,
        sampleBookings: PREVIEW_BOOKINGS,
      };
      const providerSpy = {
        getProviderListings: vi.fn(),
        createDraftListing: vi.fn(),
        submitListing: vi.fn(),
      };

      await TestBed.configureTestingModule({
        imports: [TourGuideWizard],
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ProviderPreviewService, useValue: previewStub },
          { provide: ProviderService, useValue: providerSpy },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(TourGuideWizard);
      const comp = fixture.componentInstance;
      fixture.detectChanges();

      expect(comp.listingId()).toBe(9005);
      expect(providerSpy.getProviderListings).not.toHaveBeenCalled();
      expect(providerSpy.createDraftListing).not.toHaveBeenCalled();

      await comp.submitForVerification();
      expect(providerSpy.submitListing).not.toHaveBeenCalled();
      expect(comp.errorMessage()).toContain('Preview Mode');
    });
  });
});
