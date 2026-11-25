import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { EcoDetail } from '../../models/eco';
import { BookingSlot, Reservation } from '../../models/travel';
import { BookingCreate } from './booking-create';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { BOOKABLE_PREVIEW, TRAVEL_SOURCE, TravelApi } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { publishDate } from '../../services/workflow-state';

const base = environment.apiBaseUrl;
const day = publishDate(1);
const starts = day + 'T04:00:00Z';
const ends = day + 'T06:00:00Z';

const mockListing: EcoDetail = {
  id: 42,
  title: 'Ella Rock Sunrise Trek',
  eco_category: 'Forest & Nature Trails',
  city: 'Ella',
  district: 'Badulla',
  duration_hours: 3.5,
  base_price: '4500.00',
  currency: 'LKR',
  pricing_type: 'per_person',
  min_participants: 1,
  max_group_size: 8,
  min_age: 12,
  has_verified_eco_badge: true,
  meeting_point: 'Ella Railway Station Gate',
  environmental_guidelines: 'Stay on marked paths',
  wildlife_safety_summary: 'Keep distance from monkeys and wild birds',
  safety_rules: [
    { id: 1, title: 'Hiking Shoes', description: 'Wear sturdy footwear.', is_mandatory: true },
  ],
  images: [
    { id: 101, image_url: '/uploads/eco_experiences/ella.jpg', is_primary: true, sort_order: 0 },
  ],
};

const mockSlot: BookingSlot = {
  id: 201,
  experience_id: 42,
  starts_at: starts,
  ends_at: ends,
  capacity: 8,
  available_places: 5,
  is_open: true,
};

const mockReservation: Reservation = {
  id: 301,
  module: 'eco_experience',
  reference: 'CG-EXP-301',
  experience_id: 42,
  slot_id: 201,
  participants: 2,
  status: 'pending',
  payment_status: 'unpaid',
  payment_method: 'pay_at_location',
  total: '9000.00',
  currency: 'LKR',
  starts_at: starts,
  ends_at: ends,
};

describe('BookingCreate (Experience Booking Review Page)', () => {
  let http: HttpTestingController;
  const currentUser = signal<any>({
    id: 1,
    full_name: 'Kamal Perera',
    email: 'kamal@ceylongo.test',
    role: 'traveler',
    is_active: true,
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
    currentUser.set({
      id: 1,
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
          },
        },
        {
          provide: EXPERIENCE_CATALOG,
          useValue: { preview: false, experiences: [] },
        },
        {
          provide: BOOKABLE_PREVIEW,
          useValue: () => null,
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                day,
                slot: '201',
                travelers: '2',
                page: '1',
              }),
            },
            paramMap: of(convertToParamMap({ id: '42' })),
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders booking review header, 3-step progress stepper, and retrieves details from query params', () => {
    const fixture = TestBed.createComponent(BookingCreate);
    fixture.detectChanges();

    // 1. Flush experience detail
    http.expectOne(base + '/eco-experiences/42').flush(mockListing);
    fixture.detectChanges();

    // 2. Flush availability slots for the requested day
    http.expectOne(req => req.url === base + '/eco-experiences/42/availability').flush([mockSlot]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    // Header & progress
    expect(element.textContent).toContain('Review your booking');
    expect(element.textContent).toContain('Back to Experience');
    expect(element.textContent).toContain('Booking Details');
    expect(element.textContent).toContain('Payment');
    expect(element.textContent).toContain('Confirmation');

    // Booking Details Card
    expect(element.textContent).toContain('Ella Rock Sunrise Trek');
    expect(element.textContent).toContain('3.5 hours');
    expect(element.textContent).toContain('2 travelers');

    // Pre-populated traveler info
    const nameInput = element.querySelector<HTMLInputElement>('#travelerName');
    const emailInput = element.querySelector<HTMLInputElement>('#travelerEmail');
    expect(nameInput?.value).toBe('Kamal Perera');
    expect(emailInput?.value).toBe('kamal@ceylongo.test');

    // Sticky Summary Card & Pricing
    expect(element.textContent).toContain('Booking Summary');
    expect(element.textContent).toContain('LKR 4,500.00');
    expect(element.textContent).toContain('× 2');
    expect(element.textContent).toContain('LKR 9,000.00');
  });

  it('allows editing date, time slot, and travelers count in edit mode', () => {
    const fixture = TestBed.createComponent(BookingCreate);
    fixture.detectChanges();

    http.expectOne(base + '/eco-experiences/42').flush(mockListing);
    fixture.detectChanges();

    http.expectOne(req => req.url === base + '/eco-experiences/42/availability').flush([mockSlot]);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.isEditing()).toBe(false);

    // Enter edit mode
    component.startEditing();
    fixture.detectChanges();
    expect(component.isEditing()).toBe(true);

    // Increase travelers
    component.incrementTravelers();
    fixture.detectChanges();
    expect(component.travelers()).toBe(3);

    // Subtotal should update to 3 * 4500 = 13500
    expect(component.subtotal()).toBe(13500);

    // Save editing
    component.saveEditing();
    fixture.detectChanges();
    expect(component.isEditing()).toBe(false);
  });

  it('validates mandatory safety rules and requires agreement before continuing to payment', () => {
    const fixture = TestBed.createComponent(BookingCreate);
    fixture.detectChanges();

    http.expectOne(base + '/eco-experiences/42').flush(mockListing);
    fixture.detectChanges();

    http.expectOne(req => req.url === base + '/eco-experiences/42/availability').flush([mockSlot]);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.hasMandatorySafety()).toBe(true);
    expect(component.acceptSafetyRules()).toBe(false);

    // Attempting to continue without accepting safety rules
    component.continueToPayment();
    fixture.detectChanges();

    expect(component.error()).toContain('accept the mandatory safety rules');
    http.expectNone(base + '/eco-reservations');

    // Accept safety rules
    component.acceptSafetyRules.set(true);
    fixture.detectChanges();
    expect(component.isBookingValid()).toBe(true);

    // Submit reservation
    component.continueToPayment();
    const reserveReq = http.expectOne({ method: 'POST', url: base + '/eco-reservations' });
    expect(reserveReq.request.body).toEqual({
      slot_id: 201,
      participants: 2,
      accepts_safety_rules: true,
    });

    reserveReq.flush(mockReservation);
    fixture.detectChanges();

    // Verify confirmation step (Step 3)
    expect(component.step()).toBe(3);
    expect(component.confirmedReservation()?.reference).toBe('CG-EXP-301');
    expect(fixture.nativeElement.textContent).toContain('Reservation Request Confirmed!');
    expect(fixture.nativeElement.textContent).toContain('CG-EXP-301');
    expect(fixture.nativeElement.textContent).toContain('LKR 9,000.00');
  });

  it('handles slot capacity overflow and unauthenticated guest login flow', () => {
    currentUser.set(null); // Unauthenticated guest

    const fixture = TestBed.createComponent(BookingCreate);
    fixture.detectChanges();

    http.expectOne(base + '/eco-experiences/42').flush(mockListing);
    fixture.detectChanges();

    http.expectOne(req => req.url === base + '/eco-experiences/42/availability').flush([mockSlot]);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.fullName.set('Nimal Silva');
    component.email.set('nimal@example.com');
    component.acceptSafetyRules.set(true);

    // Capacity overflow check: available_places = 5
    component.travelers.set(7);
    expect(component.isBookingValid()).toBe(false);

    // Valid traveler count
    component.travelers.set(3);
    expect(component.isBookingValid()).toBe(true);
  });
});
