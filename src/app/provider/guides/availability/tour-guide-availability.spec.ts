import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AvailabilitySlotResponse,
  HomestayBookingDetails,
  ReviewListing,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { TourGuideAvailability } from './tour-guide-availability';

describe('TourGuideAvailability Component', () => {
  let component: TourGuideAvailability;
  let fixture: ComponentFixture<TourGuideAvailability>;
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
    details: {},
    homestay_metadata: null,
    rooms: [],
  };

  const mockSlots: AvailabilitySlotResponse[] = [
    {
      id: 72,
      unit_id: 23,
      listing_id: 41,
      starts_at: '2027-03-15T09:00:00+05:30',
      ends_at: '2027-03-15T11:00:00+05:30',
      capacity: 4,
      is_open: true,
    },
  ];

  const mockBookings: HomestayBookingDetails[] = [
    {
      id: 105,
      listing_id: 41,
      traveler_id: 21,
      request_key: 'req-guide-105',
      booking_reference: 'GUIDE-105',
      slot_id: 72,
      starts_at: '2027-03-15T09:00:00+05:30',
      ends_at: '2027-03-15T11:00:00+05:30',
      quantity: 2,
      total_amount: '4500.00',
      currency: 'LKR',
      status: 'confirmed',
      created_at: '2026-11-26T10:00:00Z',
      room_ids: [23],
      payments: [{ status: 'unpaid', method: 'at_location' }],
    },
  ];

  beforeEach(async () => {
    providerServiceMock = {
      getProviderListings: vi.fn().mockReturnValue(of([mockGuide])),
      getProviderBookings: vi.fn().mockReturnValue(of(mockBookings)),
      getGuidePackages: vi.fn().mockReturnValue(
        of([
          {
            id: 23,
            title: 'Ella Heritage Walk',
            description: 'Explore local history with a guide.',
            itinerary: null,
            duration_hours: '2.00',
            pricing_type: 'per_group',
            price: '4500.00',
            currency: 'LKR',
            max_people: 4,
            included_services: null,
            excluded_services: null,
            meeting_point: 'Ella station',
            is_active: true,
          },
        ])
      ),
      getAvailabilitySlots: vi.fn().mockReturnValue(of(mockSlots)),
      addAvailabilitySlot: vi.fn().mockReturnValue(
        of({
          id: 73,
          unit_id: 23,
          listing_id: 41,
          starts_at: '2027-03-20T09:00:00+05:30',
          ends_at: '2027-03-20T11:00:00+05:30',
          capacity: 4,
          is_open: true,
        })
      ),
      updateAvailabilitySlot: vi.fn().mockReturnValue(
        of({ ...mockSlots[0], is_open: false })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [TourGuideAvailability],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TourGuideAvailability);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads slots and surfaces overlapping guide reservation conflicts', () => {
    expect(providerServiceMock['getAvailabilitySlots']).toHaveBeenCalledWith(41, 100, 0);
    expect(component.slots().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Reservation GUIDE-105');
  });

  it('adds slot using package duration and blocks/unblocks existing slots', () => {
    component.slotDate = '2027-03-20';
    component.slotStartTime = '09:00';
    component.onPackageOrStartTimeChange();
    expect(component.slotEndTime).toBe('11:00');

    component.saveSlot();
    expect(providerServiceMock['addAvailabilitySlot']).toHaveBeenCalledWith(
      41,
      expect.objectContaining({ unit_id: 23, capacity: 4, is_open: true })
    );

    component.toggleSlotOpen(mockSlots[0]);
    expect(providerServiceMock['updateAvailabilitySlot']).toHaveBeenCalledWith(
      41,
      72,
      expect.objectContaining({ is_open: false })
    );
  });
});
