import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReviewListing } from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { TourGuidePackages } from './tour-guide-packages';

describe('TourGuidePackages Component', () => {
  let component: TourGuidePackages;
  let fixture: ComponentFixture<TourGuidePackages>;
  let providerServiceMock: Record<string, ReturnType<typeof vi.fn>>;

  const mockGuide: ReviewListing = {
    listing: {
      id: 41,
      provider_id: 10,
      category: 'guide',
      title: 'Nadee Fernando — Ella Guide',
      description: 'Certified local tour guide.',
      district: 'Badulla',
      locality: 'Ella',
      latitude: '6.866700',
      longitude: '81.046600',
      price: '4500.00',
      currency: 'LKR',
      approval_status: 'approved',
      is_active: true,
      media: [],
      units: [],
      created_at: '2026-11-20T08:00:00Z',
    },
    verification_status: 'approved',
    submitted_at: null,
    decided_at: null,
    decision_reason: null,
    details: { house_rules: 'Ella Railway Station' },
    homestay_metadata: null,
    rooms: [],
  };

  const mockPackages = [
    {
      id: 23,
      title: 'Ella Heritage Walk',
      description: 'Explore historical landmarks with a local guide.',
      itinerary: '08:00 AM Station -> 10:00 AM Bridge',
      duration_hours: '2.00',
      pricing_type: 'per_group' as const,
      price: '4500.00',
      currency: 'LKR' as const,
      max_people: 6,
      included_services: 'Guide commentary',
      excluded_services: 'Tickets',
      meeting_point: 'Ella Railway Station',
      is_active: true,
    },
  ];

  beforeEach(async () => {
    providerServiceMock = {
      getProviderListings: vi.fn().mockReturnValue(of([mockGuide])),
      getGuidePackages: vi.fn().mockReturnValue(of(mockPackages)),
      createGuidePackage: vi.fn().mockReturnValue(
        of({ ...mockPackages[0], id: 24, title: 'Sunset Cloud Forest Hike' })
      ),
      updateGuidePackage: vi.fn().mockReturnValue(
        of({ ...mockPackages[0], is_active: false })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [TourGuidePackages],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TourGuidePackages);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads guide listings and packages from backend', () => {
    expect(providerServiceMock['getProviderListings']).toHaveBeenCalledWith(100, 0, 'guide');
    expect(providerServiceMock['getGuidePackages']).toHaveBeenCalledWith(41);
    expect(component.packages().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Ella Heritage Walk');
  });

  it('creates a new package with valid backend payload and toggles deactivation', () => {
    component.title = 'Sunset Cloud Forest Hike';
    component.description = 'Guided afternoon cloud forest hike around Ella hills.';
    component.durationHours = 3;
    component.price = 7500;
    component.pricingType = 'per_person';
    component.maxPeople = 8;
    component.meetingPoint = 'Ella Railway Station';

    component.savePackage();
    expect(providerServiceMock['createGuidePackage']).toHaveBeenCalledWith(
      41,
      expect.objectContaining({
        title: 'Sunset Cloud Forest Hike',
        pricing_type: 'per_person',
        currency: 'LKR',
        is_active: true,
      })
    );

    component.togglePackageStatus(component.packages()[0]);
    expect(providerServiceMock['updateGuidePackage']).toHaveBeenCalledWith(
      41,
      23,
      expect.objectContaining({ is_active: false })
    );
  });
});
