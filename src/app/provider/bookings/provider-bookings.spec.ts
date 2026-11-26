import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderBookings } from './provider-bookings';
import { ProviderService } from '../../core/services/provider.service';
import { HomestayBookingDetails } from '../../core/models/provider.models';

describe('ProviderBookings Component', () => {
  let component: ProviderBookings;
  let fixture: ComponentFixture<ProviderBookings>;

  const mockBookings: HomestayBookingDetails[] = [
    {
      id: 101,
      listing_id: 1,
      traveler_id: 201,
      request_key: 'req-abc-12345678',
      starts_at: '2026-12-01T14:00:00Z',
      ends_at: '2026-12-05T11:00:00Z',
      quantity: 2,
      total_amount: '18500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-20T10:00:00Z',
      room_ids: [10],
      payments: [{ status: 'completed', amount: '18500.00' }],
    },
    {
      id: 102,
      listing_id: 2,
      traveler_id: 202,
      request_key: 'req-def-87654321',
      starts_at: '2026-12-10T14:00:00Z',
      ends_at: '2026-12-12T11:00:00Z',
      quantity: 4,
      total_amount: '32000.00',
      currency: 'LKR',
      status: 'confirmed',
      created_at: '2026-11-21T11:00:00Z',
      room_ids: [20, 21],
      payments: [{ status: 'completed', amount: '32000.00' }],
    },
    {
      id: 103,
      listing_id: 3,
      traveler_id: 203,
      request_key: 'req-adv-55551111',
      booking_reference: 'CG-ADV-103',
      slot_id: 401,
      starts_at: '2026-12-15T08:00:00+05:30',
      ends_at: '2026-12-15T11:00:00+05:30',
      quantity: 3,
      total_amount: '25500.00',
      currency: 'LKR',
      status: 'confirmed',
      created_at: '2026-11-22T09:00:00Z',
      room_ids: [],
      payments: [{ status: 'unpaid', provider: 'pay_at_location', amount: '25500.00' }],
      traveler_contact: {
        full_name: 'Nimali Perera',
        email: 'nimali@example.com',
        phone: '+94771234567',
      },
    },
  ];

  let providerServiceMock: {
    getProviderBookings: ReturnType<typeof vi.fn>;
    getProviderListings: ReturnType<typeof vi.fn>;
    getProviderBooking: ReturnType<typeof vi.fn>;
    updateBookingStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    providerServiceMock = {
      getProviderBookings: vi.fn().mockReturnValue(of(mockBookings)),
      getProviderListings: vi.fn().mockReturnValue(
        of([
          {
            listing: {
              id: 3,
              provider_id: 10,
              category: 'adventure',
              title: 'Sigiriya Pidurangala Sunrise Trek',
              description: 'Sunrise guided climb',
              district: 'Matale',
              locality: 'Sigiriya',
              price: '8500.00',
              currency: 'LKR',
              approval_status: 'approved',
              is_active: true,
              media: [],
              units: [],
              created_at: '2026-11-15T09:00:00Z',
            },
            verification_status: 'approved',
            submitted_at: null,
            decided_at: null,
            decision_reason: null,
            details: {},
            homestay_metadata: null,
            rooms: [],
          },
        ])
      ),
      getProviderBooking: vi.fn().mockImplementation((id: number) =>
        of(mockBookings.find((b) => b.id === id) || null)
      ),
      updateBookingStatus: vi.fn().mockReturnValue(of({ success: true })),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderBookings],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderBookings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load bookings on init', () => {
    expect(component).toBeTruthy();
    expect(providerServiceMock.getProviderBookings).toHaveBeenCalled();
    expect(component.bookings().length).toBe(3);
    expect(component.isLoading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Provider Booking Management');
    expect(compiled.textContent).toContain('#101');
    expect(compiled.textContent).toContain('#102');
    expect(compiled.textContent).toContain('CG-ADV-103');
    expect(compiled.textContent).toContain('Sigiriya Pidurangala Sunrise Trek');
    expect(compiled.textContent).toContain('Nimali Perera');
    expect(compiled.textContent).toContain('Pay at Location');
    expect(compiled.textContent).toContain('Unpaid');
  });

  it('should filter bookings by tab', () => {
    component.onFilterChange('pending');
    expect(providerServiceMock.getProviderBookings).toHaveBeenCalledWith('pending');
  });

  it('should search bookings by ID and request key', () => {
    component.searchQuery.set('101');
    const filtered = component.filteredBookings();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(101);

    component.searchQuery.set('req-def');
    const filteredKey = component.filteredBookings();
    expect(filteredKey.length).toBe(1);
    expect(filteredKey[0].id).toBe(102);
  });

  it('should open confirm modal and update booking to confirmed', () => {
    const booking = mockBookings[0];
    component.promptAction(booking, 'confirm');

    expect(component.isActionModalOpen()).toBe(true);
    expect(component.activeBooking()?.id).toBe(101);
    expect(component.actionType()).toBe('confirm');

    component.confirmAction();

    expect(providerServiceMock.updateBookingStatus).toHaveBeenCalledWith(101, {
      to_status: 'confirmed',
      reason: null,
    });
    expect(component.bookings().find((b) => b.id === 101)?.status).toBe('confirmed');
    expect(component.isActionModalOpen()).toBe(false);
  });

  it('should open reject modal, set reason, and update booking to rejected', () => {
    const booking = mockBookings[0];
    component.promptAction(booking, 'reject');
    component.rejectReason = 'Fully booked on those dates';

    expect(component.actionType()).toBe('reject');

    component.confirmAction();

    expect(providerServiceMock.updateBookingStatus).toHaveBeenCalledWith(101, {
      to_status: 'rejected',
      reason: 'Fully booked on those dates',
    });
    expect(component.bookings().find((b) => b.id === 101)?.status).toBe('rejected');
  });

  it('should handle error when loading bookings', () => {
    providerServiceMock.getProviderBookings.mockReturnValueOnce(
      throwError(() => new Error('Server error'))
    );
    component.loadBookings();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Failed to load reservations');
  });

  it('should mark confirmed adventure booking completed and handle inline cancel errors', () => {
    const adventureBooking = mockBookings[2];
    component.promptAction(adventureBooking, 'complete');
    component.confirmAction();

    expect(providerServiceMock.updateBookingStatus).toHaveBeenCalledWith(103, {
      to_status: 'completed',
      reason: null,
    });
    expect(component.bookings().find((b) => b.id === 103)?.status).toBe('completed');

    component.promptAction(adventureBooking, 'cancel');
    component.rejectReason = 'Severe storm warning';
    providerServiceMock.updateBookingStatus.mockReturnValueOnce(
      throwError(() => ({ error: { detail: 'Cannot cancel completed booking' } }))
    );
    component.confirmAction();
    expect(component.actionErrorMessage()).toBe('Cannot cancel completed booking');
  });

  it('identifies tour guide bookings, package titles, and Pay at Location unpaid status', () => {
    const guideBooking: HomestayBookingDetails = {
      id: 104,
      listing_id: 41,
      traveler_id: 204,
      request_key: 'req-guide-104',
      booking_reference: 'GUIDE-104',
      slot_id: 72,
      starts_at: '2027-03-15T09:00:00+05:30',
      ends_at: '2027-03-15T11:00:00+05:30',
      quantity: 2,
      total_amount: '4500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-26T08:00:00Z',
      room_ids: [23],
      payments: [{ status: 'unpaid', method: 'at_location', amount: '4500.00' }],
    };

    component.listingsMap.update((curr) => ({
      ...curr,
      41: {
        listing: {
          id: 41,
          provider_id: 10,
          category: 'guide',
          title: 'Nadee Fernando — Ella Guide',
          description: 'Guide',
          district: 'Badulla',
          locality: 'Ella',
          price: '4500.00',
          currency: 'LKR',
          approval_status: 'approved',
          is_active: true,
          media: [],
          units: [{ id: 23, label: 'Ella Heritage Walk', capacity: 6, is_active: true }],
          created_at: '2026-11-26T08:00:00Z',
        },
        verification_status: 'approved',
        submitted_at: null,
        decided_at: null,
        decision_reason: null,
        details: {
          packages: [{ id: 23, title: 'Ella Heritage Walk' }],
        },
        homestay_metadata: null,
        rooms: [],
      },
    }));
    component.bookings.update((curr) => [guideBooking, ...curr]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('GUIDE-104');
    expect(compiled.textContent).toContain('Tour Package: Ella Heritage Walk');
    expect(compiled.textContent).toContain('Pay at Location');
    expect(compiled.textContent).toContain('Unpaid');
  });
});
