import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { BookingPanel } from '../components/booking-panel';
import { ExperiencePaymentStatus } from '../components/payment-status';
import { EcoDetail } from '../models/eco';
import { Reservation } from '../models/travel';
import { BookingDetail } from '../pages/traveler/booking-detail';
import { SavedExperiences } from '../pages/traveler/wishlist';
import { MyExperienceBookings } from '../pages/traveler/bookings';
import { BOOKABLE_PREVIEW, TRAVEL_SOURCE, TravelApi } from '../services/travel-api';
import { TravelSession } from '../services/travel-session';
import { WishlistState } from '../services/wishlist-state';
import { publishDate } from '../services/workflow-state';

const base = environment.apiBaseUrl;
const wishlist = base + '/wishlists/me';
const bookings = base + '/eco-reservations';
const day = publishDate(1);
const starts = day + 'T04:00:00Z';
const ends = day + 'T06:00:00Z';
const listing: EcoDetail = {
  id: 42, title: 'Eco trail', eco_category: 'Forest & Nature Trails', city: 'Ella', district: 'Badulla',
  duration_hours: 2, base_price: '12.30', currency: 'LKR', pricing_type: 'per_group', min_participants: 2,
  max_group_size: 6, min_age: 10, has_verified_eco_badge: false, meeting_point: 'Trailhead',
  environmental_guidelines: 'Stay on the trail', wildlife_safety_summary: 'Listen to the guide',
  safety_rules: [{id: 1, title: 'Guide', description: 'Follow instructions.', is_mandatory: true}],
};
const slot = {id: 14, experience_id: 42, starts_at: starts, ends_at: ends, capacity: 6, available_places: 3, is_open: true};
const row: Reservation = {
  id: 12, module: 'eco_experience', reference: 'ECO-12', experience_id: 42, slot_id: 14, participants: 2,
  status: 'pending', payment_status: 'unpaid', payment_method: 'pay_at_location', total: '19.95',
  currency: 'LKR', starts_at: starts, ends_at: ends,
};

describe('Traveler workflow contracts and state', () => {
  let http: HttpTestingController;
  const account = signal<{id: number} | null>(null);
  beforeEach(() => {
    account.set({id: 1});
    TestBed.configureTestingModule({providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      {provide: TravelSession, useValue: {account}},
      {provide: ActivatedRoute, useValue: {
        snapshot: {queryParamMap: convertToParamMap({})}, paramMap: of(convertToParamMap({bookingId: '12'})),
      }},
    ]});
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses production sources by default and serializes wishlist paging and availability filters', () => {
    const api = TestBed.inject(TravelApi);
    expect(TestBed.inject(TRAVEL_SOURCE)).toBe(api);
    expect(TestBed.inject(BOOKABLE_PREVIEW)('safari')).toBeNull();
    api.saved(2, 8, true).subscribe();
    const request = http.expectOne(req => req.url === wishlist);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('page_size')).toBe('8');
    expect(request.request.params.get('available_only')).toBe('true');
    request.flush({items: [], total: 0, page: 2, page_size: 8, total_pages: 0});
  });

  it('optimistically saves once, reconciles duplicate add and missing remove, and rolls back other errors', () => {
    const state = TestBed.inject(WishlistState);
    state.ensure();
    state.ensure();
    http.expectOne(req => req.url === wishlist).flush({items: [], page: 1, total_pages: 0});
    const target = base + '/wishlists/eco/42';
    state.toggle(42);
    state.toggle(42);
    expect(state.saved().has(42)).toBe(true);
    const add = http.expectOne({method: 'POST', url: target});
    expect(add.request.body).toBeNull();
    add.flush({detail: 'Eco experience is already in your wishlist'}, {status: 409, statusText: 'Conflict'});
    expect(state.saved().has(42)).toBe(true);

    state.toggle(42);
    http.expectOne({method: 'DELETE', url: target}).flush({}, {status: 404, statusText: 'Not Found'});
    expect(state.saved().has(42)).toBe(false);

    state.toggle(42);
    http.expectOne({method: 'POST', url: target}).flush({}, {status: 503, statusText: 'Unavailable'});
    expect(state.saved().has(42)).toBe(false);
    expect(state.error()).toContain('Could not update');
  });

  it('clears the previous traveler wishlist and cancels its in-flight request', () => {
    const state = TestBed.inject(WishlistState);
    state.ensure();
    http.expectOne(req => req.url === wishlist).flush({
      items: [{eco_experience_id: 42}], page: 1, total_pages: 1,
    });
    expect(state.saved().has(42)).toBe(true);
    state.toggle(42);
    const stale = http.expectOne({method: 'DELETE', url: base + '/wishlists/eco/42'});
    account.set({id: 2});
    expect(state.saved().size).toBe(0);
    state.ensure();
    expect(stale.cancelled).toBe(true);
    http.expectOne(req => req.url === wishlist).flush({
      items: [{eco_experience_id: 7}], page: 1, total_pages: 1,
    });
    expect([...state.saved()]).toEqual([7]);
    account.set(null);
    expect(state.saved().size).toBe(0);
  });

  function bookingPanel() {
    const fixture = TestBed.createComponent(BookingPanel);
    fixture.componentRef.setInput('listing', listing);
    fixture.componentRef.setInput('routeId', '42');
    fixture.componentRef.setInput('reviewMode', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.validDay('2000-01-01')).toBe(false);
    expect(component.validDay('2026-11-31')).toBe(false);
    component.form.controls.date.setValue(day);
    component.chooseDay(day);
    fixture.detectChanges();
    const availability = http.expectOne(req => req.url === base + '/eco-experiences/42/availability');
    expect(availability.request.params.get('day')).toBe(day);
    expect(availability.request.params.get('page')).toBe('1');
    expect(availability.request.params.get('page_size')).toBe('10');
    availability.flush([slot]);
    fixture.detectChanges();
    component.form.controls.slot.setValue(14);
    return {fixture, component};
  }

  function fill(component: BookingPanel): void {
    component.form.controls.ages.at(0).setValue(30);
    component.form.controls.ages.at(1).setValue(12);
    component.form.controls.safety.setValue(true);
  }

  it('validates traveler capacity, ages and safety, then submits once and uses the server total', () => {
    const {component, fixture} = bookingPanel();
    component.form.controls.participants.setValue(4);
    component.inspect();
    expect(component.error()).toContain('available capacity');
    component.form.controls.participants.setValue(2);
    component.inspect();
    expect(component.error()).toContain('accept the mandatory safety rules');
    fill(component);
    component.inspect();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Estimated total: LKR 12.30');
    component.submit();
    component.submit();
    const request = http.expectOne({method: 'POST', url: bookings});
    expect(request.request.body).toEqual({slot_id: 14, participants: 2, accepts_safety_rules: true, participant_ages: [30, 12]});
    request.flush(row);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Confirmed amount: LKR 19.95');
  });

  it('refreshes conflicted slots and blocks an uncertain result from automatic or duplicate submission', () => {
    const {component, fixture} = bookingPanel();
    fill(component);
    component.inspect();
    component.submit();
    http.expectOne(bookings).flush({}, {status: 409, statusText: 'Conflict'});
    fixture.detectChanges();
    expect(component.form.controls.slot.value).toBeNull();
    http.expectOne(req => req.url === base + '/eco-experiences/42/availability').flush([slot]);
    fixture.detectChanges();
    component.form.controls.slot.setValue(14);
    component.inspect();
    component.submit();
    http.expectOne(bookings).error(new ProgressEvent('error'));
    component.submit();
    http.expectNone(bookings);
    expect(component.uncertain()).toBe(true);
    fixture.destroy();
    const reopened = bookingPanel().component;
    fill(reopened);
    reopened.inspect();
    reopened.submit();
    http.expectNone(bookings);
    expect(reopened.error()).toContain('result is unknown');
  });

  it('renders unavailable saved entries and reloads a filtered page after an error', () => {
    const fixture = TestBed.createComponent(SavedExperiences);
    fixture.detectChanges();
    const unavailable = {id: 8, eco_experience_id: 42, is_available: false, experience: null};
    http.expectOne(req => req.url === wishlist && req.params.get('page_size') === '100').flush({
      items: [unavailable], page: 1, total_pages: 1,
    });
    http.expectOne(req => req.url === wishlist && req.params.get('page_size') === '8').flush({
      items: [unavailable], page: 1, total: 1, total_pages: 1,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Experience unavailable');
    expect(fixture.nativeElement.textContent).toContain('Remove from saved');
    fixture.componentInstance.filter(true);
    fixture.detectChanges();
    http.expectOne(req => req.url === wishlist && req.params.get('available_only') === 'true')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Could not load saved experiences');
    fixture.componentInstance.retry();
    fixture.detectChanges();
    http.expectOne(req => req.url === wishlist && req.params.get('available_only') === 'true').flush({
      items: [], page: 1, total: 0, total_pages: 0,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No saved experiences on this page');
  });

  it('uses booking history pagination and never loads private data anonymously', () => {
    account.set(null);
    const fixture = TestBed.createComponent(MyExperienceBookings);
    fixture.detectChanges();
    http.expectNone(req => req.url.startsWith(bookings));
    expect(fixture.nativeElement.textContent).toContain('Sign in to view');
    account.set({id: 9});
    fixture.detectChanges();
    http.expectOne(req => req.url === bookings + '/me' && req.params.get('page') === '1').flush(Array(8).fill(row).map((item, i) => ({...item,id:i})));
    fixture.detectChanges();
    fixture.componentInstance.page.set(2);
    fixture.detectChanges();
    const next = http.expectOne(req => req.url === bookings + '/me' && req.params.get('page') === '2');
    expect(next.request.params.get('page_size')).toBe('8');
    next.flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No reservations');
  });

  it('handles unowned reservation errors without revealing details or requesting payment information', () => {
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();
    http.expectOne(bookings + '/12').flush({}, {status: 404, statusText: 'Not Found'});
    fixture.detectChanges();
    http.expectNone(bookings + '/12/payments/status');
    expect(fixture.nativeElement.textContent).toContain('Reservation unavailable');
  });

  it('uses the server cancellation outcome, blocks duplicate clicks, and does not initiate checkout', () => {
    const api = TestBed.inject(TravelApi);
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();
    http.expectOne(bookings + '/12').flush(row);
    fixture.detectChanges();
    http.expectOne(bookings + '/12/payments/status').flush({
      booking_id: 12, booking_status: 'pending', payment_method: 'pay_at_location', payment_status: 'unpaid',
      total_price: '19.95', currency: 'LKR',
    });
    const dialog = {close: () => {}} as HTMLDialogElement;
    fixture.componentInstance.reason.setValue('  Change of plans  ');
    fixture.componentInstance.cancel(row, dialog);
    fixture.componentInstance.cancel(row, dialog);
    const cancel = http.expectOne({method: 'POST', url: bookings + '/12/cancel'});
    expect(cancel.request.body).toEqual({reason: 'Change of plans'});
    cancel.flush({...row, status: 'cancelled'});
    fixture.detectChanges();
    http.expectOne(bookings + '/12').flush({...row, status: 'cancelled'});
    fixture.detectChanges();
    http.expectOne(bookings + '/12/payments/status').flush({
      booking_id: 12, booking_status: 'cancelled', payment_method: 'pay_at_location', payment_status: 'unpaid',
      total_price: '19.95', currency: 'LKR',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reservation status: cancelled');
    http.expectNone(bookings + '/12/payments/initiate');
    api.prepareCheckout(12).subscribe();
    const prepare = http.expectOne({method: 'POST', url: bookings + '/12/payments/initiate'});
    expect(prepare.request.body).toBeNull();
    prepare.flush({});
  });

  it('keeps cancellation locked after an uncertain mutation and a failed refresh', () => {
    const fixture = TestBed.createComponent(BookingDetail);
    fixture.detectChanges();
    http.expectOne(bookings + '/12').flush(row);
    fixture.detectChanges();
    const status = http.expectOne(bookings + '/12/payments/status');
    const payload = {booking_id: 12, booking_status: 'pending', payment_method: 'pay_at_location',
      payment_status: 'unpaid', total_price: '19.95', currency: 'LKR'};
    status.flush(payload);
    const dialog = {close: () => {}} as HTMLDialogElement;
    const component = fixture.componentInstance;
    component.cancel(row, dialog);
    http.expectOne(bookings + '/12/cancel').error(new ProgressEvent('error'));
    expect(component.checkRequired()).toBe(true);
    component.retry();
    fixture.detectChanges();
    http.expectOne(bookings + '/12').flush({}, {status: 503, statusText: 'Unavailable'});
    component.cancel(row, dialog);
    http.expectNone(bookings + '/12/cancel');
    expect(component.checkRequired()).toBe(true);
    component.retry();
    fixture.detectChanges();
    http.expectOne(bookings + '/12').flush(row);
    fixture.detectChanges();
    http.expectOne(bookings + '/12/payments/status').flush(payload);
    expect(component.checkRequired()).toBe(false);
  });

  it('displays server payment status and amount with a manual refresh', () => {
    const fixture = TestBed.createComponent(ExperiencePaymentStatus);
    fixture.componentRef.setInput('bookingId', 12);
    fixture.detectChanges();
    const payload = {booking_id: 12, booking_status: 'confirmed', payment_method: 'online',
      payment_status: 'pending', total_price: '31.05', currency: 'LKR'};
    http.expectOne(bookings + '/12/payments/status').flush(payload);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('LKR 31.05');
    expect(fixture.nativeElement.textContent).toContain('pending verification');
    fixture.componentInstance.retry();
    fixture.detectChanges();
    http.expectOne(bookings + '/12/payments/status').flush({...payload, payment_status: 'paid'});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Payment: paid');
  });
});
