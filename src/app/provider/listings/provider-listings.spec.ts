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
    expect(component.listings().length).toBe(2);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Ella Green View Homestay');
    expect(compiled.textContent).toContain('Kandy Hill Villa');
  });

  it('should filter listings by verification status', () => {
    component.selectedFilter.set('approved');
    const filtered = component.filteredListings();
    expect(filtered.length).toBe(1);
    expect(filtered[0].listing.title).toBe('Ella Green View Homestay');

    component.selectedFilter.set('action_required');
    const actionRequired = component.filteredListings();
    expect(actionRequired.length).toBe(1);
    expect(actionRequired[0].listing.title).toBe('Kandy Hill Villa');
  });

  it('should publish an approved unpublished listing with publishListing', () => {
    component.publishListing(1);
    expect(providerServiceMock.publishListing).toHaveBeenCalledWith(1);
  });

  it('should open feedback modal for listing with action required', () => {
    const listing = mockReviews[1];
    component.openFeedbackModal(listing);
    expect(component.isFeedbackModalOpen()).toBe(true);
    expect(component.activeListing()?.listing.title).toBe('Kandy Hill Villa');
  });
});
