import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdventureWizard } from './adventure-wizard';
import { ProviderService } from '../../../core/services/provider.service';
import { ReviewListing } from '../../../core/models/provider.models';

describe('AdventureWizard Component', () => {
  let component: AdventureWizard;
  let fixture: ComponentFixture<AdventureWizard>;
  let router: Router;

  const baseReview: ReviewListing = {
    listing: {
      id: 42,
      provider_id: 7,
      category: 'adventure',
      title: 'Knuckles Sunrise Trek',
      description: 'Guided alpine forest trek.\n\nIncludes ridge crossing and waterfall stop.',
      district: 'Kandy',
      locality: 'Bambarella',
      latitude: '7.451200',
      longitude: '80.781100',
      price: '9500.00',
      currency: 'LKR',
      approval_status: 'draft',
      is_active: false,
      media: [{ id: 10, storage_key: 'p/10.jpg', sort_order: 0, alt_text: 'Ridge' }],
      units: [{ id: 501, label: 'Participants', capacity: 8, is_active: true }],
      created_at: '2026-11-25T08:00:00Z',
    },
    verification_status: 'draft',
    submitted_at: null,
    decided_at: null,
    decision_reason: null,
    details: {
      province: 'Central',
      address: 'Bambarella Gate',
      links: [{ kind: 'instagram', url: 'https://instagram.com/knucklestrek' }],
      notes: 'Trained wilderness guides with first-aid kits.',
      files: [{ id: 'ev-1', kind: 'safety', media_type: 'application/pdf' }],
      activity: {
        category: 'hiking-trekking',
        meeting_point: 'Bambarella Entrance Gate',
        duration_minutes: 240,
        min_participants: 2,
        max_participants: 8,
        minimum_age: 12,
        highlights: ['Cloud forest trail'],
        included: ['Local guide'],
        excluded: ['Hotel transfer'],
        equipment: 'Trekking poles',
        facilities: 'Restrooms at base camp',
        safety_instructions: 'Follow lead guide on wet rock sections.',
        restrictions: 'Moderate fitness required.',
        cancellation_policy: 'Free cancellation 24h prior.',
      },
    },
    homestay_metadata: null,
    rooms: [],
  };

  let providerServiceMock: {
    createDraftListing: ReturnType<typeof vi.fn>;
    getProviderListing: ReturnType<typeof vi.fn>;
    updateListingDraft: ReturnType<typeof vi.fn>;
    submitListing: ReturnType<typeof vi.fn>;
    uploadPhoto: ReturnType<typeof vi.fn>;
    setCoverPhoto: ReturnType<typeof vi.fn>;
    deletePhoto: ReturnType<typeof vi.fn>;
    getPhotoBlob: ReturnType<typeof vi.fn>;
    saveEvidence: ReturnType<typeof vi.fn>;
    uploadEvidenceFile: ReturnType<typeof vi.fn>;
    deleteEvidenceFile: ReturnType<typeof vi.fn>;
    getAvailabilitySlots: ReturnType<typeof vi.fn>;
    addAvailabilitySlot: ReturnType<typeof vi.fn>;
    updateAvailabilitySlot: ReturnType<typeof vi.fn>;
  };

  function setupMock(): void {
    providerServiceMock = {
      createDraftListing: vi.fn().mockReturnValue(
        of({
          ...baseReview,
          listing: { ...baseReview.listing, id: 99, title: '', description: '', media: [], units: [] },
          details: {},
        })
      ),
      getProviderListing: vi.fn().mockReturnValue(of(baseReview)),
      updateListingDraft: vi.fn().mockReturnValue(of(baseReview)),
      submitListing: vi.fn().mockReturnValue(
        of({ ...baseReview, verification_status: 'pending' })
      ),
      uploadPhoto: vi.fn().mockReturnValue(
        of({ id: 11, storage_key: 'p/11.jpg', sort_order: 1, alt_text: 'Summit' })
      ),
      setCoverPhoto: vi.fn().mockReturnValue(of(baseReview)),
      deletePhoto: vi.fn().mockReturnValue(of({ success: true })),
      getPhotoBlob: vi.fn().mockReturnValue(of(new Blob(['img'], { type: 'image/png' }))),
      saveEvidence: vi.fn().mockReturnValue(of(baseReview)),
      uploadEvidenceFile: vi.fn().mockReturnValue(of({ id: 'ev-2', kind: 'license', media_type: 'application/pdf' })),
      deleteEvidenceFile: vi.fn().mockReturnValue(of({ success: true })),
      getAvailabilitySlots: vi.fn().mockReturnValue(of([])),
      addAvailabilitySlot: vi.fn().mockReturnValue(
        of({
          id: 301,
          unit_id: 501,
          starts_at: '2027-01-10T08:00:00+05:30',
          ends_at: '2027-01-10T11:00:00+05:30',
          capacity: 8,
          is_open: true,
        })
      ),
      updateAvailabilitySlot: vi.fn().mockReturnValue(
        of({
          id: 301,
          unit_id: 501,
          starts_at: '2027-01-10T08:00:00+05:30',
          ends_at: '2027-01-10T11:00:00+05:30',
          capacity: 8,
          is_open: false,
        })
      ),
    };
  }

  describe('New Draft Initialization', () => {
    beforeEach(async () => {
      setupMock();
      await TestBed.configureTestingModule({
        imports: [AdventureWizard],
        providers: [
          provideRouter([]),
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

      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
      fixture = TestBed.createComponent(AdventureWizard);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create a single server-side draft on init and avoid duplicate draft calls', async () => {
      await fixture.whenStable();
      expect(providerServiceMock.createDraftListing).toHaveBeenCalledTimes(1);
      expect(providerServiceMock.createDraftListing).toHaveBeenCalledWith('adventure');
      expect(component.listingId()).toBe(99);
      expect(component.isLoading()).toBe(false);
    });

    it('should validate Step 1 fields before advancing', async () => {
      await fixture.whenStable();
      component.title = 'Hi';
      await component.nextStep();

      expect(component.currentStep()).toBe(1);
      expect(component.errorMessage()).toContain('at least 3 characters');

      component.title = 'Ella Rock Sunrise Hike';
      component.shortDescription = 'Short scenic trail hike.';
      component.durationMinutes = 180;
      await component.nextStep();

      expect(providerServiceMock.updateListingDraft).toHaveBeenCalledWith(
        99,
        expect.objectContaining({
          title: 'Ella Rock Sunrise Hike',
          description: 'Short scenic trail hike.',
        })
      );
      expect(component.currentStep()).toBe(2);

      component.locality = 'Ella';
      component.meetingPoint = 'Ella Railway Station Main Gate';
      await component.nextStep();

      expect(providerServiceMock.updateListingDraft).toHaveBeenCalledWith(
        99,
        expect.objectContaining({
          locality: 'Ella',
          activity: expect.objectContaining({
            category: 'hiking-trekking',
            meeting_point: 'Ella Railway Station Main Gate',
            duration_minutes: 180,
          }),
        })
      );
      expect(component.currentStep()).toBe(3);
    });

    it('should upload, set cover, and delete activity photos', async () => {
      await fixture.whenStable();
      const file = new File(['photo'], 'trail.jpg', { type: 'image/jpeg' });
      const uploadEvent = { target: { files: [file], value: 'trail.jpg' } } as unknown as Event;

      await component.onPhotoSelected(uploadEvent);
      expect(providerServiceMock.uploadPhoto).toHaveBeenCalledWith(99, file, 'trail.jpg');
      expect(component.photos().length).toBe(1);

      await component.setCoverPhoto(11);
      expect(providerServiceMock.setCoverPhoto).toHaveBeenCalledWith(99, 11);

      await component.deletePhoto(11);
      expect(providerServiceMock.deletePhoto).toHaveBeenCalledWith(99, 11);
    });
  });

  describe('Resume Existing Draft & Submission', () => {
    beforeEach(async () => {
      setupMock();
      await TestBed.configureTestingModule({
        imports: [AdventureWizard],
        providers: [
          provideRouter([]),
          { provide: ProviderService, useValue: providerServiceMock },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                paramMap: convertToParamMap({ id: '42' }),
                queryParamMap: convertToParamMap({}),
              },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(AdventureWizard);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should resume server draft and hydrate all 6 steps including photos and slots', async () => {
      await fixture.whenStable();
      expect(providerServiceMock.getProviderListing).toHaveBeenCalledWith(42);
      expect(providerServiceMock.createDraftListing).not.toHaveBeenCalled();
      expect(component.title).toBe('Knuckles Sunrise Trek');
      expect(component.activityCategory).toBe('hiking-trekking');
      expect(component.meetingPoint).toBe('Bambarella Entrance Gate');
      expect(component.highlights).toEqual(['Cloud forest trail']);
      expect(component.safetyInstructions).toContain('wet rock sections');
      expect(component.photos().length).toBe(1);
      expect(providerServiceMock.getPhotoBlob).toHaveBeenCalledWith(42, 10);
    });

    it('should add and block an availability slot on Step 4', async () => {
      await fixture.whenStable();
      component.slotDate = '2027-01-10';
      component.slotStartTime = '08:00';
      component.slotEndTime = '11:00';
      component.slotCapacity = 6;
      component.slotIsOpen = true;

      await component.saveSlot();
      expect(providerServiceMock.addAvailabilitySlot).toHaveBeenCalledWith(42, {
        unit_id: 501,
        starts_at: '2027-01-10T08:00:00+05:30',
        ends_at: '2027-01-10T11:00:00+05:30',
        capacity: 6,
        is_open: true,
      });
      expect(component.slots().length).toBe(1);

      await component.toggleSlotOpen(component.slots()[0]);
      expect(providerServiceMock.updateAvailabilitySlot).toHaveBeenCalled();
      expect(component.slots()[0].is_open).toBe(false);
    });

    it('should require declaration and safety evidence before submitting listing', async () => {
      await fixture.whenStable();
      component.currentStep.set(6);
      component.declarationAccepted = false;

      await component.submitForVerification();
      expect(component.errorMessage()).toContain('declaration');
      expect(providerServiceMock.submitListing).not.toHaveBeenCalled();

      component.declarationAccepted = true;
      await component.submitForVerification();

      expect(providerServiceMock.updateListingDraft).toHaveBeenCalled();
      expect(providerServiceMock.saveEvidence).toHaveBeenCalled();
      expect(providerServiceMock.submitListing).toHaveBeenCalledWith(42);
      expect(component.isSubmitted()).toBe(true);
      expect(component.verificationStatus()).toBe('pending');
    });

    it('should lock editing when listing is suspended', async () => {
      providerServiceMock.getProviderListing.mockReturnValueOnce(
        of({ ...baseReview, verification_status: 'suspended', decision_reason: 'Safety audit' })
      );
      component.ngOnInit();
      await fixture.whenStable();

      expect(component.isSuspended()).toBe(true);
      await component.saveDraftProgress();
      expect(component.errorMessage()).toContain('Suspended listings cannot be edited');
    });
  });
});
