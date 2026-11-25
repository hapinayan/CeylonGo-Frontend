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
  ];

  let providerServiceMock: {
    getProviderBookings: ReturnType<typeof vi.fn>;
    updateBookingStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    providerServiceMock = {
      getProviderBookings: vi.fn().mockReturnValue(of(mockBookings)),
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
    expect(component.bookings().length).toBe(2);
    expect(component.isLoading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Provider Booking Management');
    expect(compiled.textContent).toContain('#101');
    expect(compiled.textContent).toContain('#102');
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
});
