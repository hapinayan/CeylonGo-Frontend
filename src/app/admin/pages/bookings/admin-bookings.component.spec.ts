import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminBookingKPIs,
  AdminBookingListItem,
} from '../../core/models/admin-bookings.models';
import { AdminBookingsService } from '../../core/services/admin-bookings.service';
import { AdminBookingsComponent } from './admin-bookings.component';

describe('AdminBookingsComponent', () => {
  let component: AdminBookingsComponent;
  let fixture: ComponentFixture<AdminBookingsComponent>;

  const mockBooking: AdminBookingListItem = {
    id: 1,
    booking_reference: 'BK-TG-2026-101',
    category: 'tour_guide',
    traveler_id: 501,
    traveler_name: 'Oliver Schmidt',
    traveler_email: 'oliver.schmidt@berlin-travel.de',
    traveler_phone: '+49 170 1234567',
    provider_id: 101,
    provider_name: 'Dinesh Wickramasinghe',
    provider_business_name: 'Ceylon Heritage Explorers',
    service_title: 'Kandy Kingdom Half-Day Historical Walk',
    start_date: '2026-04-10T08:30:00Z',
    end_date: '2026-04-10T13:00:00Z',
    amount: 15000,
    currency: 'LKR',
    booking_status: 'confirmed',
    payment_status: 'captured',
    payment_method: 'online',
    created_at: '2026-03-15T09:20:00Z',
  };

  const mockKPIs: AdminBookingKPIs = {
    total_bookings: 10,
    confirmed_bookings: 7,
    pending_bookings: 2,
    completed_bookings: 1,
    cancelled_or_disputed: 0,
  };

  const mockService = {
    canViewBookings: signal(true),
    getBookings: vi.fn().mockReturnValue(
      of({
        items: [mockBooking],
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
      })
    ),
    getBookingById: vi.fn().mockReturnValue(of({ ...mockBooking, number_of_guests: 2 })),
    getBookingKPIs: vi.fn().mockReturnValue(of(mockKPIs)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBookingsComponent],
      providers: [{ provide: AdminBookingsService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load bookings on init', () => {
    expect(component).toBeTruthy();
    expect(component.bookings.length).toBe(1);
    expect(component.kpis.total_bookings).toBe(10);
  });

  it('should filter by booking category', () => {
    component.onCategoryChange('tour_guide');
    expect(component.selectedCategory).toBe('tour_guide');
    expect(mockService.getBookings).toHaveBeenCalled();
  });

  it('should filter by booking status', () => {
    component.onStatusChange('confirmed');
    expect(component.selectedStatus).toBe('confirmed');
    expect(mockService.getBookings).toHaveBeenCalled();
  });

  it('should open and close booking detail modal', () => {
    component.openDetail(mockBooking);
    expect(mockService.getBookingById).toHaveBeenCalledWith(1);
    expect(component.selectedBookingDetail).toBeTruthy();

    component.closeDetail();
    expect(component.selectedBookingDetail).toBeNull();
  });

  it('should handle pagination changes', () => {
    component.totalPages = 5;
    component.goToPage(3);
    expect(component.currentPage).toBe(3);
  });
});
