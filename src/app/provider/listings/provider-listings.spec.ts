import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderListings } from './provider-listings';
import { ProviderService } from '../../core/services/provider.service';
import { ReviewListing } from '../../core/models/provider.models';

describe('ProviderListings Component', () => {
  let component: ProviderListings;
  let fixture: ComponentFixture<ProviderListings>;
  let providerServiceMock: {
    getProviderListings: ReturnType<typeof vi.fn>;
    publishListing: ReturnType<typeof vi.fn>;
    unpublishListing: ReturnType<typeof vi.fn>;
    submitListing: ReturnType<typeof vi.fn>;
    saveEvidence: ReturnType<typeof vi.fn>;
    uploadEvidenceFile: ReturnType<typeof vi.fn>;
    getPhotoBlob: ReturnType<typeof vi.fn>;
  };

  const mockReviews: ReviewListing[] = [
    {
      listing: {
        id: 1,
        provider_id: 10,
        category: 'homestay',
        title: 'Ella Green View Homestay',
        description: 'Mountain view retreat',
        district: 'Badulla',
        locality: 'Ella',
        price: '6500.00',
        currency: 'LKR',
        approval_status: 'approved',
        is_active: false,
        media: [],
        units: [],
        created_at: new Date().toISOString(),
      },
      verification_status: 'approved',
      submitted_at: '2026-11-20T10:00:00Z',
      decided_at: '2026-11-21T10:00:00Z',
      decision_reason: null,
      details: {},
      homestay_metadata: null,
      rooms: [],
    },
    {
      listing: {
        id: 2,
        provider_id: 10,
        category: 'homestay',
        title: 'Kandy Hill Villa',
        description: 'Hill country villa',
        district: 'Kandy',
        locality: 'Kandy',
        price: '7500.00',
        currency: 'LKR',
        approval_status: 'more_evidence_required',
        is_active: false,
        media: [],
        units: [],
        created_at: new Date().toISOString(),
      },
      verification_status: 'more_evidence_required',
      submitted_at: '2026-11-22T10:00:00Z',
      decided_at: '2026-11-23T10:00:00Z',
      decision_reason: 'Please upload Grama Niladhari certificate.',
      details: {},
      homestay_metadata: null,
      rooms: [],
    },
    {
      listing: {
        id: 3,
        provider_id: 10,
        category: 'adventure',
        title: 'Horton Plains Sunrise Hike',
        description: 'Guided trek across Worlds End',
        district: 'Nuwara Eliya',
        locality: 'Ohiya',
        price: '9200.00',
        currency: 'LKR',
        approval_status: 'approved',
        is_active: false,
        media: [{ id: 55, storage_key: 'p/55.jpg', sort_order: 0 }],
        units: [],
        created_at: new Date().toISOString(),
      },
      verification_status: 'approved',
      submitted_at: '2026-11-22T10:00:00Z',
      decided_at: '2026-11-23T10:00:00Z',
      decision_reason: null,
      details: {
        activity: { category: 'hiking-trekking' },
      },
      homestay_metadata: null,
      rooms: [],
    },
  ];

  beforeEach(async () => {
    providerServiceMock = {
      getProviderListings: vi.fn().mockReturnValue(of(mockReviews)),
      publishListing: vi.fn().mockReturnValue(
        of({
          ...mockReviews[0],
          listing: { ...mockReviews[0].listing, is_active: true },
        })
      ),
      unpublishListing: vi.fn().mockReturnValue(
        of({
          ...mockReviews[0],
          listing: { ...mockReviews[0].listing, is_active: false },
        })
      ),
      submitListing: vi.fn().mockReturnValue(
        of({
          ...mockReviews[1],
          verification_status: 'pending',
        })
      ),
      saveEvidence: vi.fn().mockReturnValue(of({})),
      uploadEvidenceFile: vi.fn().mockReturnValue(of({ id: 'doc-1' })),
      getPhotoBlob: vi.fn().mockReturnValue(of(new Blob(['img'], { type: 'image/png' }))),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderListings],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderListings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load provider listings on init', () => {
    expect(component.listings().length).toBe(3);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ella Green View Homestay');
    expect(compiled.textContent).toContain('Kandy Hill Villa');
    expect(compiled.textContent).toContain('Horton Plains Sunrise Hike');
    expect(compiled.textContent).toContain('/ participant');
    expect(compiled.textContent).toContain('Hiking & Trekking');
  });

  it('should filter listings by verification status and category', () => {
    component.selectedFilter.set('approved');
    const filtered = component.filteredListings();
    expect(filtered.length).toBe(2);

    component.selectedCategory.set('adventure');
    const adventures = component.filteredListings();
    expect(adventures.length).toBe(1);
    expect(adventures[0].listing.title).toBe('Horton Plains Sunrise Hike');

    component.selectedCategory.set('all');
    component.selectedFilter.set('action_required');
    const actionRequired = component.filteredListings();
    expect(actionRequired.length).toBe(1);
    expect(actionRequired[0].listing.title).toBe('Kandy Hill Villa');
  });

  it('should publish an approved unpublished listing with publishListing', () => {
    component.publishListing(1);
    expect(providerServiceMock.publishListing).toHaveBeenCalledWith(1);
  });

  it('should open feedback modal and require explicit redaction before customer_feedback upload', () => {
    const listing = mockReviews[1];
    component.openFeedbackModal(listing);
    expect(component.isFeedbackModalOpen()).toBe(true);
    expect(component.activeListing()?.listing.title).toBe('Kandy Hill Villa');

    component.selectedEvidenceKind = 'customer_feedback';
    const file = new File(['img'], 'fb.png', { type: 'image/png' });
    component.onFileSelected({ target: { files: [file] } } as unknown as Event);
    expect(component.isRedacted).toBe(false);

    component.resubmitEvidence();
    expect(component.modalError).toContain('redacted');
    expect(providerServiceMock.uploadEvidenceFile).not.toHaveBeenCalled();

    component.isRedacted = true;
    component.resubmitEvidence();
    expect(providerServiceMock.uploadEvidenceFile).toHaveBeenCalledWith(
      2,
      file,
      'customer_feedback',
      true
    );
    expect(providerServiceMock.submitListing).toHaveBeenCalledWith(2);
  });

  it('displays tour guide languages and specializations and supports guide actions', () => {
    const guideListing: ReviewListing = {
      listing: {
        id: 4,
        provider_id: 10,
        category: 'guide',
        title: 'Nadee Fernando — Ella Guide',
        description: 'Highland guide',
        district: 'Badulla',
        locality: 'Ella',
        price: '4500.00',
        currency: 'LKR',
        approval_status: 'approved',
        is_active: true,
        media: [],
        units: [],
        created_at: new Date().toISOString(),
      },
      verification_status: 'approved',
      submitted_at: null,
      decided_at: null,
      decision_reason: null,
      details: {
        guide: {
          years_of_experience: 6,
          categories: ['cultural_heritage', 'adventure_nature'],
          languages: [
            { language_code: 'en', language_name: 'English', proficiency_level: 'fluent', is_primary: true },
            { language_code: 'si', language_name: 'Sinhala', proficiency_level: 'native', is_primary: false },
          ],
          service_areas: [],
          cancellation_policy: null,
        },
      },
      homestay_metadata: null,
      rooms: [],
    };
    component.listings.update((items) => [...items, guideListing]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cultural & Heritage, Adventure & Nature');
    expect(compiled.textContent).toContain('Languages: English, Sinhala');
    expect(compiled.textContent).toContain('Manage Packages');
    expect(compiled.textContent).toContain('Manage Availability');
  });
});
