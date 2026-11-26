import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { BookingPanel } from '../components/booking-panel';
import { SaveControl } from '../components/save-control';
import {
  ActivityBookingDetailResponse,
  ActivityBookingResponse,
  ActivityDetails,
  ActivitySlotDetails,
} from '../models/activity';
import { BookingDetail } from '../pages/traveler/booking-detail';
import { MyExperienceBookings } from '../pages/traveler/bookings';
import { SavedExperiences } from '../pages/traveler/wishlist';
import { TRAVEL_SOURCE, TravelApi } from '../services/travel-api';
import { TravelSession } from '../services/travel-session';
import { WishlistState } from '../services/wishlist-state';
import { publishDate } from '../services/workflow-state';

const base = environment.apiBaseUrl;
const day = publishDate(1);
const starts = `${day}T03:30:00Z`;
const ends = `${day}T05:30:00Z`;

const activity: ActivityDetails = {
  id: 41,
  title: 'Ella Ridge Hike',
  description: 'Guided ridge hike.',
  district: 'Badulla',
  locality: 'Ella',
  latitude: '6.866700',
  longitude: '81.046600',
  price_per_participant: '2500.00',
  currency: 'LKR',
  activity: {
    category: 'hiking-trekking',
    meeting_point: 'Ella entrance',
    duration_minutes: 120,
    min_participants: 2,
    max_participants: 6,
    minimum_age: 12,
    highlights: ['Ridge viewpoint'],
    included: ['Guide'],
    excluded: [],
    equipment: null,
    facilities: null,
    safety_instructions: 'Stay on path',
    restrictions: null,
    cancellation_policy: null,
  },
  photos: [{ id: 12, image_url: '/api/v1/listings/41/photos/12', alt_text: 'Trail' }],
  provider_id: 9,
  provider_name: 'Ella Trails',
  rating: null,
  reviews: [],
};

const openSlot: ActivitySlotDetails = {
  id: 72,
  date: day,
  starts_at: starts,
  ends_at: ends,
  remaining_capacity: 4,
  available: true,
  total_amount: '5000.00',
  currency: 'LKR',
};

const fullSlot: ActivitySlotDetails = {
  id: 73,
  date: day,
  starts_at: `${day}T07:30:00Z`,
  ends_at: `${day}T09:30:00Z`,
  remaining_capacity: 0,
  available: false,
  total_amount: '5000.00',
  currency: 'LKR',
};

const bookingRow: ActivityBookingResponse = {
  id: 105,
  listing_id: 41,
  traveler_id: 21,
  request_key: 'req-key-105',
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

const bookingDetailRow: ActivityBookingDetailResponse = {
  ...bookingRow,
  payments: [
    {
      id: 8,
      booking_id: 105,
      request_key: 'pay-key-105',
      attempt_no: 1,
      method: 'at_location',
      status: 'unpaid',
      display_amount: '5000.00',
      currency: 'LKR',
      created_at: '2026-11-26T11:31:00',
      resolved_at: null,
    },
  ],
};

describe('Adventure Traveler Workflows (Wishlist, Availability, My Bookings, Cancellation)', () => {
  let http: HttpTestingController;
  const account = signal<{ id: number } | null>(null);

  beforeEach(() => {
    account.set({ id: 21 });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthModalService,
        { provide: TravelSession, useValue: { account } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) },
            paramMap: of(convertToParamMap({ bookingId: '105' })),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses Activities wishlist API (GET, PUT, DELETE) and synchronizes across sessions', () => {
    const api = TestBed.inject(TravelApi);
    expect(TestBed.inject(TRAVEL_SOURCE)).toBe(api);

    const state = TestBed.inject(WishlistState);
    state.ensure();
    const loadReq = http.expectOne((r) => r.url === `${base}/activities/wishlist`);
    expect(loadReq.request.params.get('limit')).toBe('100');
    expect(loadReq.request.params.get('offset')).toBe('0');
    loadReq.flush({ items: [], next_offset: null });

    state.toggle(41);
    expect(state.saved().has(41)).toBe(true);
    const putReq = http.expectOne({ method: 'PUT', url: `${base}/activities/41/wishlist` });
    expect(putReq.request.body).toEqual({});
    putReq.flush({ listing_id: 41, saved: true });

    state.toggle(41);
    const delReq = http.expectOne({ method: 'DELETE', url: `${base}/activities/41/wishlist` });
    delReq.flush({ listing_id: 41, saved: false });
    expect(state.saved().has(41)).toBe(false);

    // Account switch clears previous wishlist
    account.set({ id: 99 });
    expect(state.saved().size).toBe(0);
    state.ensure();
    http.expectOne((r) => r.url === `${base}/activities/wishlist`).flush({
      items: [activity],
      next_offset: null,
    });
    expect([...state.saved()]).toEqual([41]);
  });

  it('opens TravelerAuthModal when unauthenticated user clicks Save', () => {
    account.set(null);
    const authModal = TestBed.inject(AuthModalService);
    const fixture = TestBed.createComponent(SaveControl);
    fixture.componentRef.setInput('id', '41');
    fixture.componentRef.setInput('title', 'Ella Ridge Hike');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(authModal.isOpen()).toBe(true);
    expect(authModal.pendingAction()?.type).toBe('wishlist');
  });

  it('loads server availability slots, disables unavailable slots, and updates server-calculated LKR quote on participant changes', () => {
    const fixture = TestBed.createComponent(BookingPanel);
    fixture.componentRef.setInput('listing', activity);
    fixture.componentRef.setInput('routeId', '41');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.chooseDay(day);
    fixture.detectChanges();

    const availReq = http.expectOne(
      (r) =>
        r.url === `${base}/activities/41/availability` &&
        r.params.get('date') === day &&
        r.params.get('participants') === '2',
    );
    availReq.flush([openSlot, fullSlot]);
    fixture.detectChanges();

    const options = [...fixture.nativeElement.querySelectorAll('select option')].slice(1) as HTMLOptionElement[];
    expect(options).toHaveLength(2);
    expect(options[0].disabled).toBe(false);
    expect(options[0].textContent).toContain('4 places left');
    expect(options[1].disabled).toBe(true);
    expect(options[1].textContent).toContain('Full / Unavailable');

    component.onSlotSelect('72');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('LKR 5,000.00');

    // Increase participants -> triggers new server availability quote
    component.incrementParticipants();
    fixture.detectChanges();
    const updatedReq = http.expectOne(
      (r) =>
        r.url === `${base}/activities/41/availability` &&
        r.params.get('date') === day &&
        r.params.get('participants') === '3',
    );
    updatedReq.flush([{ ...openSlot, total_amount: '7500.00' }, fullSlot]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('LKR 7,500.00');
  });

  it('renders SavedExperiences with offset pagination and empty/error states', () => {
    const fixture = TestBed.createComponent(SavedExperiences);
    fixture.detectChanges();

    http.expectOne((r) => r.url === `${base}/activities/wishlist` && r.params.get('limit') === '100').flush({
      items: [activity],
      next_offset: null,
    });
    http.expectOne((r) => r.url === `${base}/activities/wishlist` && r.params.get('limit') === '8').flush({
      items: [activity],
      next_offset: 8,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ella Ridge Hike');
    fixture.componentInstance.changePage(2, 8);
    fixture.detectChanges();

    http.expectOne((r) => r.url === `${base}/activities/wishlist` && r.params.get('offset') === '8').flush({
      items: [],
      next_offset: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No saved experiences yet');
  });

  it('loads MyExperienceBookings via GET /bookings/my?category=adventure with no checkout flow inside', () => {
    const fixture = TestBed.createComponent(MyExperienceBookings);
    fixture.detectChanges();

    const listReq = http.expectOne(
      (r) => r.url === `${base}/bookings/my` && r.params.get('category') === 'adventure',
    );
    listReq.flush([bookingRow]);
    http.expectOne(`${base}/bookings/105`).flush(bookingDetailRow);
    http.expectOne(`${base}/activities/41`).flush(activity);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('ACT-105');
    expect(text).toContain('Ella Ridge Hike');
    expect(text).toContain('Pay at Location');
    expect(text).toContain('unpaid');
    expect(text).toContain('Awaiting Provider Confirmation');
    http.expectNone(`${base}/payments/simulate`);
    http.expectNone(`${base}/payments/at-location`);
  });

  it('loads BookingDetail and cancels via PATCH /bookings/{id}/status without checkout flow', () => {
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();

    http.expectOne(`${base}/bookings/105`).flush(bookingDetailRow);
    http.expectOne(`${base}/activities/41`).flush(activity);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Booking Request Submitted — Awaiting Provider Confirmation',
    );
    expect(fixture.nativeElement.textContent).toContain('Pay at Location');

    const dialog = { close: () => {} } as HTMLDialogElement;
    fixture.componentInstance.reason.setValue('Change of schedule');
    fixture.componentInstance.cancel(bookingDetailRow, dialog);

    const cancelReq = http.expectOne({ method: 'PATCH', url: `${base}/bookings/105/status` });
    expect(cancelReq.request.body).toEqual({
      to_status: 'cancelled',
      reason: 'Change of schedule',
    });
    cancelReq.flush({ ...bookingRow, status: 'cancelled' });
    fixture.detectChanges();

    http.expectOne(`${base}/bookings/105`).flush({ ...bookingDetailRow, status: 'cancelled' });
    http.expectOne(`${base}/activities/41`).flush(activity);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Status: cancelled');
    http.expectNone(`${base}/payments/simulate`);
  });
});
