import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityAvailability } from './activity-availability';
import { ProviderService } from '../../../core/services/provider.service';
import {
  AvailabilitySlotResponse,
  HomestayBookingDetails,
  ReviewListing,
} from '../../../core/models/provider.models';

describe('ActivityAvailability Component', () => {
  let component: ActivityAvailability;
  let fixture: ComponentFixture<ActivityAvailability>;

  const mockAdventure: ReviewListing = {
    listing: {
      id: 15,
      provider_id: 5,
      category: 'adventure',
      title: 'Kithulgala White Water Rafting',
      description: 'Class 3 rapids adventure.',
      district: 'Kegalle',
      locality: 'Kithulgala',
      price: '7500.00',
      currency: 'LKR',
      approval_status: 'approved',
      is_active: true,
      media: [],
      units: [{ id: 88, label: 'Rafters', capacity: 8, is_active: true }],
      created_at: '2026-11-20T09:00:00Z',
    },
    verification_status: 'approved',
    submitted_at: '2026-11-20T09:30:00Z',
    decided_at: '2026-11-21T10:00:00Z',
    decision_reason: null,
    details: {
      activity: {
        category: 'water-activities',
        meeting_point: 'Rafting Base Dock',
        duration_minutes: 150,
        min_participants: 2,
        max_participants: 8,
      },
    },
    homestay_metadata: null,
    rooms: [],
  };

  const mockSlots: AvailabilitySlotResponse[] = [
    {
      id: 401,
      unit_id: 88,
      listing_id: 15,
      starts_at: '2027-02-15T09:00:00+05:30',
      ends_at: '2027-02-15T11:30:00+05:30',
      capacity: 8,
      is_open: true,
    },
  ];

  const mockBookings: HomestayBookingDetails[] = [
    {
      id: 901,
      listing_id: 15,
      traveler_id: 30,
      request_key: 'rk-901',
      starts_at: '2027-02-15T09:00:00+05:30',
      ends_at: '2027-02-15T11:30:00+05:30',
      quantity: 3,
      total_amount: '22500.00',
      currency: 'LKR',
      status: 'confirmed',
      created_at: '2026-11-25T10:00:00Z',
      slot_id: 401,
      room_ids: [],
      payments: [{ status: 'unpaid', provider: 'pay_at_location' }],
    },
  ];

  let providerServiceMock: {
    getProviderListings: ReturnType<typeof vi.fn>;
    getProviderBookings: ReturnType<typeof vi.fn>;
    getAvailabilitySlots: ReturnType<typeof vi.fn>;
    addAvailabilitySlot: ReturnType<typeof vi.fn>;
    updateAvailabilitySlot: ReturnType<typeof vi.fn>;
    updateListingDraft: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    providerServiceMock = {
      getProviderListings: vi.fn().mockReturnValue(of([mockAdventure])),
      getProviderBookings: vi.fn().mockReturnValue(of(mockBookings)),
      getAvailabilitySlots: vi.fn().mockReturnValue(of(mockSlots)),
      addAvailabilitySlot: vi.fn().mockReturnValue(
        of({
          id: 402,
          unit_id: 88,
          starts_at: '2027-02-16T14:00:00+05:30',
          ends_at: '2027-02-16T16:30:00+05:30',
          capacity: 6,
          is_open: true,
        })
      ),
      updateAvailabilitySlot: vi.fn().mockReturnValue(
        of({ ...mockSlots[0], is_open: false })
      ),
      updateListingDraft: vi.fn().mockReturnValue(
        of({
          ...mockAdventure,
          listing: { ...mockAdventure.listing, price: '8000.00' },
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ActivityAvailability],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ listingId: '15' }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityAvailability);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load activities, slots, and calculate remaining slot capacity', () => {
    expect(providerServiceMock.getProviderListings).toHaveBeenCalledWith(100, 0, 'adventure');
    expect(component.selectedListingId()).toBe(15);
    expect(component.slots().length).toBe(1);
    expect(component.remainingCapacity(mockSlots[0])).toBe(5);
  });

  it('should add a new availability slot and block an existing slot', () => {
    component.slotDate = '2027-02-16';
    component.slotStartTime = '14:00';
    component.slotEndTime = '16:30';
    component.slotCapacity = 6;
    component.slotIsOpen = true;

    component.saveSlot();
    expect(providerServiceMock.addAvailabilitySlot).toHaveBeenCalledWith(15, {
      unit_id: 88,
      starts_at: '2027-02-16T14:00:00+05:30',
      ends_at: '2027-02-16T16:30:00+05:30',
      capacity: 6,
      is_open: true,
    });
    expect(component.slots().length).toBe(2);

    component.toggleSlotOpen(mockSlots[0]);
    expect(providerServiceMock.updateAvailabilitySlot).toHaveBeenCalledWith(
      15,
      401,
      expect.objectContaining({ is_open: false })
    );
  });

  it('should reject invalid end time and surface conflict errors cleanly', () => {
    component.slotDate = '2027-02-16';
    component.slotStartTime = '15:00';
    component.slotEndTime = '14:00';
    component.saveSlot();
    expect(component.errorMessage()).toContain('End time must be after start time');

    component.slotStartTime = '14:00';
    component.slotEndTime = '16:00';
    providerServiceMock.addAvailabilitySlot.mockReturnValueOnce(
      throwError(() => ({ error: { detail: 'Slot overlaps an existing departure' } }))
    );
    component.saveSlot();
    expect(component.errorMessage()).toContain('overlaps');
  });

  it('should support routine LKR price updates without changing verification workflow', () => {
    component.routinePrice = 8000;
    component.saveRoutinePrice();
    expect(providerServiceMock.updateListingDraft).toHaveBeenCalledWith(15, { price: 8000 });
    expect(component.successMessage()).toContain('preserve approval');
  });
});
