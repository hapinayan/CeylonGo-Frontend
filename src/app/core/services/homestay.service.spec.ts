import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  HomestayBookingRequest,
  HomestayDetails,
  SimulatedPaymentRequest,
} from '../models/homestay.models';
import { HomestayService } from './homestay.service';

describe('HomestayService', () => {
  let service: HomestayService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HomestayService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HomestayService);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return 8 approved categories with exact reference names', () => {
    const categories = service.getCategories();
    expect(categories.length).toBe(8);
    expect(categories[0].id).toBe('all');
    expect(categories.map((c) => c.name)).toContain('All Homestays');
    expect(categories.map((c) => c.name)).toContain('Mountain Stays');
    expect(categories.map((c) => c.name)).toContain('Beach Stays');
    expect(categories.map((c) => c.name)).toContain('Nature Stays');
    expect(categories.map((c) => c.name)).toContain('Cultural Stays');
    expect(categories.map((c) => c.name)).toContain('Eco-Friendly');
    expect(categories.map((c) => c.name)).toContain('Family Friendly');
    expect(categories.map((c) => c.name)).toContain('Budget Stays');
  });

  it('should fetch homestays via GET /api/v1/homestays with cursor pagination params', () => {
    service.getHomestays({ destination: 'Ella', limit: 12, before_id: 50 }).subscribe((res) => {
      expect(res.items.length).toBe(1);
      expect(res.next_before_id).toBeNull();
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/homestays'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('destination')).toBe('Ella');
    expect(req.request.params.get('limit')).toBe('12');
    expect(req.request.params.get('before_id')).toBe('50');

    const mockResponse = {
      items: [
        {
          id: 1,
          provider_id: 1,
          category: 'mountain',
          title: 'Ella Rock View Homestay (Live)',
          description: 'Live test homestay',
          district: 'Badulla',
          locality: 'Ella',
          latitude: '6.8667',
          longitude: '81.0466',
          price: '8500.00',
          currency: 'LKR',
          approval_status: 'approved',
          is_active: true,
          media: [],
          units: [],
          created_at: '2026-11-25T00:00:00Z',
          host: { id: 1, business_name: 'Ella Host' },
          amenities: ['Wi-Fi'],
        },
      ],
      next_before_id: null,
    };

    req.flush(mockResponse);
  });

  it('should retrieve homestay by ID via GET /api/v1/homestays/{id} without demo fallback', () => {
    service.getHomestayById(1).subscribe((item) => {
      expect(item).toBeTruthy();
      expect(item?.id).toBe(1);
      expect(item?.name).toBe('Ella Rock View Homestay (Live)');
      expect(item?.image_url).toBe(service.neutralPlaceholder);
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/homestays/1'));
    expect(req.request.method).toBe('GET');

    const mockItem: HomestayDetails = {
      id: 1,
      provider_id: 1,
      category: 'mountain',
      title: 'Ella Rock View Homestay (Live)',
      description: 'Live test homestay',
      district: 'Badulla',
      locality: 'Ella',
      latitude: '6.8667',
      longitude: '81.0466',
      price: '8500.00',
      currency: 'LKR',
      approval_status: 'approved',
      is_active: true,
      media: [],
      units: [],
      created_at: '2026-11-25T00:00:00Z',
      host: { id: 1, business_name: 'Ella Host' },
      amenities: ['Wi-Fi'],
    };

    req.flush(mockItem);
  });

  it('should return null when homestay ID does not exist on backend (no demo fallback)', () => {
    service.getHomestayById(9999).subscribe((item) => {
      expect(item).toBeNull();
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/homestays/9999'));
    req.flush({ detail: 'Homestay not found' }, { status: 404, statusText: 'Not Found' });
  });

  it('should fetch availability quote via GET /api/v1/homestays/{id}/availability', () => {
    service
      .getHomestayAvailability(1, '2026-12-05', '2026-12-07', 2, 5)
      .subscribe((quote) => {
        expect(quote.listing_id).toBe(1);
        expect(quote.nights).toBe(2);
        expect(quote.total_amount).toBe('17000.00');
        expect(quote.available_rooms.length).toBe(1);
      });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/homestays/1/availability'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('check_in')).toBe('2026-12-05');
    expect(req.request.params.get('check_out')).toBe('2026-12-07');
    expect(req.request.params.get('guests')).toBe('2');
    expect(req.request.params.get('room_id')).toBe('5');

    req.flush({
      check_in: '2026-12-05',
      check_out: '2026-12-07',
      listing_id: 1,
      nights: 2,
      nightly_rate: '8500.00',
      total_amount: '17000.00',
      currency: 'LKR',
      available_rooms: [{ id: 5, label: 'Deluxe Suite', capacity: 2, is_active: true }],
    });
  });

  it('should call backend wishlist endpoints and update wishlist state', () => {
    // Add to wishlist
    service.addToWishlist(1).subscribe((res) => {
      expect(res.saved).toBe(true);
      expect(service.isWishlisted(1)).toBe(true);
    });

    const putReq = httpTesting.expectOne((r) => r.url.endsWith('/homestays/1/wishlist'));
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ listing_id: 1, saved: true });

    // Remove from wishlist
    service.removeFromWishlist(1).subscribe(() => {
      expect(service.isWishlisted(1)).toBe(false);
    });

    const delReq = httpTesting.expectOne((r) => r.url.endsWith('/homestays/1/wishlist'));
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
  });

  it('should post booking to POST /api/v1/homestays/{id}/bookings', () => {
    const bookingPayload: HomestayBookingRequest = {
      room_id: 1,
      check_in: '2026-12-05',
      check_out: '2026-12-07',
      guests: 2,
      request_key: 'mock-uuid-key',
      expected_total: '17000.00',
    };

    service.createHomestayBooking(1, bookingPayload).subscribe((booking) => {
      expect(booking.id).toBe(101);
      expect(booking.status).toBe('pending');
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/homestays/1/bookings'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(bookingPayload);

    req.flush({
      id: 101,
      listing_id: 1,
      traveler_id: 5,
      request_key: 'mock-uuid-key',
      starts_at: '2026-12-05T14:00:00Z',
      ends_at: '2026-12-07T11:00:00Z',
      quantity: 1,
      total_amount: '17000.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-25T00:00:00Z',
      room_ids: [1],
      payments: [],
    });
  });

  it('should post simulated payment to POST /api/v1/payments/simulate', () => {
    const simPayload: SimulatedPaymentRequest = {
      booking_id: 101,
      request_key: 'mock-pay-key',
      attempt_no: 1,
      simulate_outcome: 'success',
    };

    service.simulatePayment(simPayload).subscribe((payment) => {
      expect(payment.id).toBe(55);
      expect(payment.status).toBe('demo_succeeded');
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/payments/simulate'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(simPayload);

    req.flush({
      id: 55,
      booking_id: 101,
      request_key: 'mock-pay-key',
      attempt_no: 1,
      method: 'academic_demo',
      status: 'demo_succeeded',
      display_amount: '17000.00',
      currency: 'LKR',
      created_at: '2026-11-25T00:00:00Z',
    });
  });

  it('should post pay at location to POST /api/v1/payments/at-location', () => {
    service.payAtLocation({ booking_id: 101, request_key: 'loc-key' }).subscribe((payment) => {
      expect(payment.status).toBe('unpaid');
    });

    const req = httpTesting.expectOne((r) => r.url.endsWith('/payments/at-location'));
    expect(req.request.method).toBe('POST');

    req.flush({
      id: 56,
      booking_id: 101,
      request_key: 'loc-key',
      attempt_no: 1,
      method: 'at_location',
      status: 'unpaid',
      display_amount: '17000.00',
      currency: 'LKR',
      created_at: '2026-11-25T00:00:00Z',
    });
  });

  it('should calculate night count accurately', () => {
    expect(service.calculateNights('2026-12-01', '2026-12-05')).toBe(4);
    expect(service.calculateNights('2026-12-05', '2026-12-01')).toBe(0);
    expect(service.calculateNights('2026-12-01', '2026-12-01')).toBe(0);
    expect(service.calculateNights('', '2026-12-05')).toBe(0);
  });
});
