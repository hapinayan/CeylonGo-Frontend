import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ActivityBookingDetailResponse,
  ActivityBookingResponse,
  ActivityDetails,
  ActivityPaymentResponse,
  ActivitySlotDetails,
} from '../../models/activity';
import { publishDate } from '../../services/workflow-state';
import { BookingCreate } from './booking-create';

const base = environment.apiBaseUrl;
const day = publishDate(1);
const starts = `${day}T03:30:00Z`;
const ends = `${day}T05:30:00Z`;

const mockListing: ActivityDetails = {
  id: 41,
  title: 'Ella Ridge Hike',
  description: 'A guided hike along the ridge.',
  district: 'Badulla',
  locality: 'Ella',
  latitude: '6.866700',
  longitude: '81.046600',
  price_per_participant: '2500.00',
  currency: 'LKR',
  activity: {
    category: 'hiking-trekking',
    meeting_point: 'Ella main entrance',
    duration_minutes: 120,
    min_participants: 1,
    max_participants: 8,
    minimum_age: 12,
    highlights: ['Ridge viewpoint'],
    included: ['Guide'],
    excluded: ['Transport'],
    equipment: 'Bring trail shoes',
    facilities: null,
    safety_instructions: 'Stay on the marked trail',
    restrictions: null,
    cancellation_policy: null,
  },
  photos: [{ id: 12, image_url: '/api/v1/listings/41/photos/12', alt_text: 'Ridge trail' }],
  provider_id: 9,
  provider_name: 'Ella Trails',
  rating: null,
  reviews: [],
};

const mockSlot: ActivitySlotDetails = {
  id: 72,
  date: day,
  starts_at: starts,
  ends_at: ends,
  remaining_capacity: 6,
  available: true,
  total_amount: '5000.00',
  currency: 'LKR',
};

const mockBooking: ActivityBookingResponse = {
  id: 105,
  listing_id: 41,
  traveler_id: 21,
  request_key: '2503798f-7a0c-439b-9b5a-08620661c879',
  starts_at: starts,
  ends_at: ends,
  quantity: 2,
  total_amount: '5000.00',
  currency: 'LKR',
  status: 'pending',
  created_at: '2026-11-26T11:30:00Z',
  booking_reference: 'ACT-105',
  slot_id: 72,
};

const payAtLocationResp: ActivityPaymentResponse = {
  id: 8,
  booking_id: 105,
  request_key: 'at-location-key',
  attempt_no: 1,
  method: 'at_location',
  status: 'unpaid',
  display_amount: '5000.00',
  currency: 'LKR',
  created_at: '2026-11-26T11:31:00',
  resolved_at: null,
};

const simFailedResp: ActivityPaymentResponse = {
  id: 9,
  booking_id: 105,
  request_key: 'sim-fail-key',
  attempt_no: 1,
  method: 'simulated',
  status: 'demo_failed',
  display_amount: '5000.00',
  currency: 'LKR',
  created_at: '2026-11-26T11:31:00',
  resolved_at: '2026-11-26T11:31:00',
};

const simSuccessResp: ActivityPaymentResponse = {
  id: 10,
  booking_id: 105,
  request_key: 'sim-success-key',
  attempt_no: 2,
  method: 'simulated',
  status: 'demo_succeeded',
  display_amount: '5000.00',
  currency: 'LKR',
  created_at: '2026-11-26T11:32:00',
  resolved_at: '2026-11-26T11:32:00',
};

describe('BookingCreate (Adventure Booking Review, Revalidation & Payment)', () => {
  let http: HttpTestingController;
  const currentUser = signal<any>({
    id: 21,
    full_name: 'Kamal Perera',
    email: 'kamal@ceylongo.test',
    role: 'traveler',
    is_active: true,
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    currentUser.set({
      id: 21,
      full_name: 'Kamal Perera',
      email: 'kamal@ceylongo.test',
      role: 'traveler',
      is_active: true,
    });

    TestBed.configureTestingModule({
      imports: [BookingCreate],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthModalService,
        {
          provide: AuthService,
          useValue: {
            currentUser,
            isAuthenticated: () => !!currentUser(),
            getToken: () => (currentUser() ? 'fake-token' : null),
            getCurrentUser: () => of(currentUser()),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                day,
                slot: '72',
                travelers: '2',
              }),
            },
            paramMap: of(convertToParamMap({ id: '41' })),
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function initComponent() {
    const fixture = TestBed.createComponent(BookingCreate);
    fixture.detectChanges();
    http.expectOne(`${base}/activities/41`).flush(mockListing);
    fixture.detectChanges();
    http
      .expectOne(
        (r) =>
          r.url === `${base}/activities/41/availability` &&
          r.params.get('date') === day &&
          r.params.get('participants') === '2',
      )
      .flush([mockSlot]);
    fixture.detectChanges();
    return fixture;
  }

  it('displays profile contact info, safety instructions, and server-calculated LKR quote without unsupported fields', () => {
    const fixture = initComponent();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Review your booking');
    expect(element.textContent).toContain('Ella Ridge Hike');
    expect(element.textContent).toContain('2 hours');
    expect(element.textContent).toContain('Kamal Perera');
    expect(element.textContent).toContain('kamal@ceylongo.test');
    expect(element.textContent).toContain('LKR 5,000.00');
    expect(element.querySelector('#specialReqs')).toBeNull();
    expect(element.querySelector('#travelerPhone')).toBeNull();
  });

  it('revalidates slot and price, creates booking, handles Pay at Location unpaid + awaiting provider confirmation', () => {
    const fixture = initComponent();
    const component = fixture.componentInstance;

    component.continueToPayment();
    fixture.detectChanges();
    expect(component.error()).toContain('safety instructions');
    http.expectNone(`${base}/bookings`);

    component.acceptSafetyRules.set(true);
    component.selectPaymentMethod('at_location');
    component.continueToPayment();

    // 1. Pre-booking revalidation request
    http
      .expectOne((r) => r.url === `${base}/activities/41/availability`)
      .flush([mockSlot]);

    // 2. Booking creation with exact documented payload
    const bookReq = http.expectOne({ method: 'POST', url: `${base}/bookings` });
    expect(bookReq.request.body).toEqual({
      listing_id: 41,
      slot_id: 72,
      starts_at: starts,
      ends_at: ends,
      quantity: 2,
      expected_total: '5000.00',
      request_key: component.bookingRequestKey(),
    });
    bookReq.flush(mockBooking);

    // 3. Pay at location
    const payReq = http.expectOne({ method: 'POST', url: `${base}/payments/at-location` });
    expect(payReq.request.body).toEqual({
      booking_id: 105,
      request_key: component.paymentRequestKey(),
    });
    payReq.flush(payAtLocationResp);

    // 4. Authoritative booking fetch
    const detailResp: ActivityBookingDetailResponse = {
      ...mockBooking,
      payments: [payAtLocationResp],
    };
    http.expectOne(`${base}/bookings/105`).flush(detailResp);
    fixture.detectChanges();

    expect(component.step()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain(
      'Booking Request Submitted — Awaiting Provider Confirmation',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Booking Confirmed');
    expect(fixture.nativeElement.textContent).toContain('ACT-105');
    expect(fixture.nativeElement.textContent).toContain('unpaid');
  });

  it('supports demo payment failure and safe retry with incremented attempt_no without duplicate booking', () => {
    const fixture = initComponent();
    const component = fixture.componentInstance;

    component.acceptSafetyRules.set(true);
    component.selectPaymentMethod('simulated');
    component.setSimulateOutcome('failure');
    component.continueToPayment();

    http.expectOne((r) => r.url === `${base}/activities/41/availability`).flush([mockSlot]);
    http.expectOne({ method: 'POST', url: `${base}/bookings` }).flush(mockBooking);

    const failPayReq = http.expectOne({ method: 'POST', url: `${base}/payments/simulate` });
    expect(failPayReq.request.body.attempt_no).toBe(1);
    expect(failPayReq.request.body.simulate_outcome).toBe('failure');
    failPayReq.flush(simFailedResp);
    fixture.detectChanges();

    expect(component.step()).toBe(2);
    expect(component.paymentAttemptNo()).toBe(2);
    expect(component.paymentError()).toContain('demo_failed');

    // Retry with success — MUST NOT re-POST /bookings
    component.setSimulateOutcome('success');
    component.continueToPayment();
    http.expectNone(`${base}/bookings`);

    const retryPayReq = http.expectOne({ method: 'POST', url: `${base}/payments/simulate` });
    expect(retryPayReq.request.body.attempt_no).toBe(2);
    expect(retryPayReq.request.body.simulate_outcome).toBe('success');
    retryPayReq.flush(simSuccessResp);

    http
      .expectOne(`${base}/bookings/105`)
      .flush({ ...mockBooking, status: 'confirmed', payments: [simFailedResp, simSuccessResp] });
    fixture.detectChanges();

    expect(component.step()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Booking Confirmed');
    expect(fixture.nativeElement.textContent).toContain('demo succeeded');
  });

  it('stops submission and refreshes quote if server price changes during revalidation', () => {
    const fixture = initComponent();
    const component = fixture.componentInstance;
    component.acceptSafetyRules.set(true);

    const initialKey = component.bookingRequestKey();
    component.continueToPayment();

    http
      .expectOne((r) => r.url === `${base}/activities/41/availability`)
      .flush([{ ...mockSlot, total_amount: '6000.00' }]);
    fixture.detectChanges();
    http
      .expectOne((r) => r.url === `${base}/activities/41/availability`)
      .flush([{ ...mockSlot, total_amount: '6000.00' }]);
    http.expectNone(`${base}/bookings`);
    fixture.detectChanges();

    expect(component.error()).toContain('6000.00');
    expect(component.bookingRequestKey()).not.toBe(initialKey);
  });

  it('replays identical booking request_key after network error and prevents concurrent duplicates', () => {
    const fixture = initComponent();
    const component = fixture.componentInstance;
    component.acceptSafetyRules.set(true);

    const keyBefore = component.bookingRequestKey();
    component.continueToPayment();

    http.expectOne((r) => r.url === `${base}/activities/41/availability`).flush([mockSlot]);
    const firstPost = http.expectOne({ method: 'POST', url: `${base}/bookings` });
    firstPost.error(new ProgressEvent('error'));
    fixture.detectChanges();

    // Key is preserved on network error so retry replays identically
    expect(component.bookingRequestKey()).toBe(keyBefore);
    expect(component.error()).toContain('try again');

    component.continueToPayment();
    http.expectOne((r) => r.url === `${base}/activities/41/availability`).flush([mockSlot]);
    const secondPost = http.expectOne({ method: 'POST', url: `${base}/bookings` });
    expect(secondPost.request.body.request_key).toBe(keyBefore);
    secondPost.flush(mockBooking);
    http.expectOne(`${base}/payments/at-location`).flush(payAtLocationResp);
    http.expectOne(`${base}/bookings/105`).flush({ ...mockBooking, payments: [payAtLocationResp] });
  });
});
