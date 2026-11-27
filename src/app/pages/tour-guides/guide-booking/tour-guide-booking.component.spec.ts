import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { MvpGuideDetails, MvpGuideSlot } from '../../../core/models/tour-guide.models';
import { AuthService } from '../../../core/services/auth.service';
import { TourGuideBookingComponent } from './tour-guide-booking.component';

describe('TourGuideBookingComponent (Live MVP Booking & Payment)', () => {
  let component: TourGuideBookingComponent;
  let fixture: ComponentFixture<TourGuideBookingComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  const apiBase = environment.apiBaseUrl;

  const sampleGuide: MvpGuideDetails = {
    listing: {
      id: 41,
      provider_id: 10,
      category: 'guide',
      title: 'Nadee Fernando',
      description: 'Ella guide.',
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
    provider_name: 'Ella Trails',
    profile: {
      years_of_experience: 6,
      categories: ['cultural_heritage'],
      languages: [],
      service_areas: [],
      cancellation_policy: 'Free 48h cancellation',
    },
    packages: [
      {
        id: 23,
        title: 'Ella Heritage Walk',
        description: 'Guided local tour.',
        duration_hours: '2.00',
        pricing_type: 'per_person',
        price: '2250.00',
        currency: 'LKR',
        max_people: 4,
        meeting_point: 'Ella Station',
        is_active: true,
      },
    ],
  };

  const sampleSlots: MvpGuideSlot[] = [
    {
      id: 72,
      package_id: 23,
      starts_at: '2026-12-12T03:30:00Z',
      ends_at: '2026-12-12T05:30:00Z',
      available: true,
      capacity: 4,
      total_amount: '4500.00',
      currency: 'LKR',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourGuideBookingComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '41' }),
              queryParamMap: convertToParamMap({
                packageId: '23',
                slotId: '72',
                date: '2026-12-12',
                travelers: '2',
              }),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TourGuideBookingComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();

    httpMock.expectOne(`${apiBase}/tour-guides/41`).flush(sampleGuide);
    httpMock
      .expectOne(`${apiBase}/tour-guides/41/availability?package_id=23&participants=2&date=2026-12-12`)
      .flush(sampleSlots);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads real slot quote from availability API and submits Pay at Location keeping unpaid pending state', () => {
    expect(component.totalAmount()).toBe(4500);
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);

    component.travelerName = 'Amaya Silva';
    component.travelerEmail = 'amaya@example.com';
    component.termsAccepted = true;
    component.continueToPayment();
    expect(component.step()).toBe(2);

    component.paymentMethod.set('at_location');
    component.confirmBooking();

    const bookingReq = httpMock.expectOne(`${apiBase}/bookings`);
    expect(bookingReq.request.body).toMatchObject({
      listing_id: 41,
      slot_id: 72,
      starts_at: '2026-12-12T03:30:00Z',
      ends_at: '2026-12-12T05:30:00Z',
      quantity: 2,
      expected_total: '4500.00',
    });
    bookingReq.flush({
      id: 105,
      listing_id: 41,
      traveler_id: 21,
      request_key: bookingReq.request.body.request_key,
      starts_at: '2026-12-12T03:30:00Z',
      ends_at: '2026-12-12T05:30:00Z',
      quantity: 2,
      total_amount: '4500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-26T11:30:00Z',
      booking_reference: 'GUIDE-105',
      slot_id: 72,
      package_id: 23,
    });

    const payReq = httpMock.expectOne(`${apiBase}/payments/at-location`);
    expect(payReq.request.body.booking_id).toBe(105);
    payReq.flush({
      id: 8,
      booking_id: 105,
      request_key: payReq.request.body.request_key,
      attempt_no: 1,
      method: 'at_location',
      status: 'unpaid',
      display_amount: '4500.00',
      currency: 'LKR',
      created_at: '2026-11-26T11:31:00Z',
      resolved_at: null,
    });
    fixture.detectChanges();

    expect(component.step()).toBe(3);
    expect(component.bookingRecord()?.bookingReference).toBe('GUIDE-105');
    expect(component.bookingRecord()?.bookingStatus).toBe('pending');
    expect(component.bookingRecord()?.paymentStatus).toBe('unpaid');
  });

  it('retries failed Academic Demo payment with incremented attempt_no without recreating booking', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    component.travelerName = 'Dilan Fernando';
    component.travelerEmail = 'dilan@example.com';
    component.termsAccepted = true;
    component.continueToPayment();

    component.paymentMethod.set('simulated');
    component.simulateOutcome.set('failure');
    component.confirmBooking();

    const bookingReq = httpMock.expectOne(`${apiBase}/bookings`);
    bookingReq.flush({
      id: 106,
      listing_id: 41,
      traveler_id: 21,
      request_key: bookingReq.request.body.request_key,
      starts_at: '2026-12-12T03:30:00Z',
      ends_at: '2026-12-12T05:30:00Z',
      quantity: 2,
      total_amount: '4500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-26T11:30:00Z',
      booking_reference: 'GUIDE-106',
    });

    const failPayReq = httpMock.expectOne(`${apiBase}/payments/simulate`);
    expect(failPayReq.request.body.attempt_no).toBe(1);
    expect(failPayReq.request.body.simulate_outcome).toBe('failure');
    failPayReq.flush({
      id: 9,
      booking_id: 106,
      request_key: failPayReq.request.body.request_key,
      attempt_no: 1,
      method: 'demo_online',
      status: 'demo_failed',
      display_amount: '4500.00',
      currency: 'LKR',
      created_at: '2026-11-26T11:31:00Z',
    });

    expect(component.step()).toBe(2);
    expect(component.paymentError()).toContain('not been duplicated');

    // Retry payment only (existing booking ID 106 reused)
    component.simulateOutcome.set('success');
    component.confirmBooking();

    httpMock.expectNone(`${apiBase}/bookings`);
    const retryPayReq = httpMock.expectOne(`${apiBase}/payments/simulate`);
    expect(retryPayReq.request.body.booking_id).toBe(106);
    expect(retryPayReq.request.body.attempt_no).toBe(2);
    expect(retryPayReq.request.body.simulate_outcome).toBe('success');
    retryPayReq.flush({
      id: 10,
      booking_id: 106,
      request_key: retryPayReq.request.body.request_key,
      attempt_no: 2,
      method: 'demo_online',
      status: 'demo_succeeded',
      display_amount: '4500.00',
      currency: 'LKR',
      created_at: '2026-11-26T11:32:00Z',
    });

    expect(component.step()).toBe(3);
    expect(component.bookingRecord()?.bookingReference).toBe('GUIDE-106');
    expect(component.bookingRecord()?.paymentStatus).toBe('paid_demo');
  });
});
