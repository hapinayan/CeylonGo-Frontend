import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { ReviewListing } from '../../core/models/provider.models';
import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderBookings } from '../bookings/provider-bookings';
import { ProviderListings } from '../listings/provider-listings';
import { ProviderPreviewService } from '../provider-preview.service';
import { RentalAvailability } from './availability/rental-availability';
import { RentalWizard } from './wizard/rental-wizard';

const API = environment.apiBaseUrl;

const sampleScooterReview: ReviewListing = {
  listing: {
    id: 301,
    provider_id: 9,
    category: 'bike',
    title: 'Galle Dio Fleet',
    description: 'Automatic city scooter rental.',
    district: 'Galle',
    locality: 'Galle Fort',
    latitude: '6.032900',
    longitude: '80.216800',
    price: '2500.00',
    currency: 'LKR',
    approval_status: 'approved',
    is_active: true,
    media: [],
    units: [{ id: 501, label: 'Dio #1', capacity: 1, is_active: true }],
    created_at: '2026-11-20T09:00:00Z',
  },
  verification_status: 'approved',
  submitted_at: '2026-11-20T10:00:00Z',
  decided_at: '2026-11-21T10:00:00Z',
  decision_reason: null,
  details: {
    province: 'Southern',
    rental: {
      subtype: 'scooter',
      transmission: 'automatic',
      pickup_name: 'Galle Fort Office',
      requirements: 'Valid motorcycle driving license required.',
    },
  },
  homestay_metadata: null,
  rooms: [],
};

const sampleBicycleReview: ReviewListing = {
  listing: {
    id: 302,
    provider_id: 9,
    category: 'bicycle',
    title: 'Ella Trek Trail Fleet',
    description: 'Mountain bicycles for Ella trails.',
    district: 'Badulla',
    locality: 'Ella',
    latitude: '6.866700',
    longitude: '81.046600',
    price: '1200.00',
    currency: 'LKR',
    approval_status: 'draft',
    is_active: false,
    media: [],
    units: [{ id: 502, label: 'Trek #1', capacity: 1, is_active: true }],
    created_at: '2026-11-22T09:00:00Z',
  },
  verification_status: 'draft',
  submitted_at: null,
  decided_at: null,
  decision_reason: null,
  details: {
    province: 'Uva',
    rental: {
      subtype: 'mountain',
      transmission: 'manual',
      pickup_name: 'Ella Station Courtyard',
    },
  },
  homestay_metadata: null,
  rooms: [],
};

describe('Bike & Bicycle Rental Provider Module', () => {
  let http: HttpTestingController;

  const authStub = {
    getToken: () => 'provider-jwt',
    currentProviderUser: () => ({ id: 9, role: 'provider', verification_status: 'approved' }),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'provider/listings', component: ProviderListings },
        ]),
        { provide: ProviderAuthService, useValue: authStub },
        {
          provide: ProviderPreviewService,
          useValue: {
            isPreview: () => false,
            queryParams: () => ({}),
            sampleListings: [],
            sampleBookings: [],
            sampleSlotsMap: {},
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('RentalWizard creates real bicycle draft (disallowing automatic), adds unit, and submits for approval', async () => {
    const fixture: ComponentFixture<RentalWizard> = TestBed.createComponent(RentalWizard);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp.onVehicleKindChange('bicycle');
    expect(comp.apiCategory).toBe('bicycle');
    expect(comp.transmission).toBe('manual');
    expect(comp.isMotorized).toBe(false);

    comp.title = 'Ella Mountain Cycle';
    comp.description = 'Sturdy trail bicycle.';
    comp.district = 'Badulla';
    comp.locality = 'Ella';
    comp.pickupName = 'Ella Station Desk';
    comp.pricePerDay = 1400;

    const flushMicrotasks = async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve();
    };

    const savePromise = comp.ensureDraftAndSave();
    const createReq = http.expectOne({ method: 'POST', url: `${API}/provider/listings` });
    expect(createReq.request.body).toEqual({ category: 'bicycle' });
    createReq.flush(sampleBicycleReview);

    await flushMicrotasks();
    const patchReq = http.expectOne({ method: 'PATCH', url: `${API}/provider/listings/302` });
    expect(patchReq.request.body.category).toBe('bicycle');
    expect(patchReq.request.body.rental.pickup_name).toBe('Ella Station Desk');
    patchReq.flush(sampleBicycleReview);

    const savedId = await savePromise;
    expect(savedId).toBe(302);

    const unitPromise = comp.addFleetUnit('Trek #2');
    await flushMicrotasks();
    http.expectOne({ method: 'PATCH', url: `${API}/provider/listings/302` }).flush(sampleBicycleReview);
    await flushMicrotasks();
    const unitReq = http.expectOne({ method: 'POST', url: `${API}/provider/listings/302/units` });
    expect(unitReq.request.body).toEqual({ label: 'Trek #2', capacity: 1 });
    unitReq.flush({ id: 503, listing_id: 302, label: 'Trek #2', capacity: 1, is_active: true });
    await unitPromise;

    comp.declarationAccepted = true;
    comp.submitForVerification();

    await flushMicrotasks();
    http.expectOne({ method: 'PATCH', url: `${API}/provider/listings/302` }).flush(sampleBicycleReview);
    await flushMicrotasks();
    http.expectOne({ method: 'PUT', url: `${API}/provider/listings/302/evidence` }).flush(sampleBicycleReview);
    await flushMicrotasks();
    const submitReq = http.expectOne({ method: 'POST', url: `${API}/provider/listings/302/submit` });
    submitReq.flush({ ...sampleBicycleReview, verification_status: 'pending' });
    await flushMicrotasks();
    expect(comp.verificationStatus()).toBe('pending');
  });

  it('RentalAvailability loads bikes/bicycles, toggles units, updates routine daily price, and blocks dates', async () => {
    const fixture: ComponentFixture<RentalAvailability> = TestBed.createComponent(RentalAvailability);
    fixture.detectChanges();

    http.expectOne(`${API}/provider/listings?limit=100&offset=0&category=bike`).flush([sampleScooterReview]);
    http.expectOne(`${API}/provider/listings?limit=100&offset=0&category=bicycle`).flush([sampleBicycleReview]);
    http.expectOne(`${API}/provider/bookings?category=bike`).flush([]);
    http.expectOne(`${API}/provider/bookings?category=bicycle`).flush([]);
    http.expectOne(`${API}/provider/listings/301/availability?limit=100&offset=0`).flush([]);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.selectedListing()?.listing.title).toBe('Galle Dio Fleet');

    comp.routinePrice = 2800;
    const pricePromise = comp.saveRoutineDailyPrice();
    const priceReq = http.expectOne({ method: 'PATCH', url: `${API}/provider/listings/301` });
    expect(priceReq.request.body.price).toBe('2800.00');
    priceReq.flush({ ...sampleScooterReview, listing: { ...sampleScooterReview.listing, price: '2800.00' } });
    await pricePromise;

    comp.slotIsOpen = false;
    const slotPromise = comp.saveAvailabilityWindow();
    const slotReq = http.expectOne({ method: 'POST', url: `${API}/provider/listings/301/availability` });
    expect(slotReq.request.body.is_open).toBe(false);
    expect(slotReq.request.body.unit_id).toBe(501);
    slotReq.flush({
      id: 701,
      unit_id: 501,
      listing_id: 301,
      starts_at: slotReq.request.body.starts_at,
      ends_at: slotReq.request.body.ends_at,
      capacity: 1,
      is_open: false,
    });
    await slotPromise;
    expect(comp.slots().length).toBe(1);
  });

  it('ProviderListings and ProviderBookings handle rental listings, Pay at Location (unpaid), and booking confirmation', () => {
    const listingsFix = TestBed.createComponent(ProviderListings);
    listingsFix.detectChanges();
    http.expectOne(`${API}/provider/listings?limit=100&offset=0`).flush([sampleScooterReview, sampleBicycleReview]);
    listingsFix.detectChanges();

    expect(listingsFix.nativeElement.textContent).toContain('Scooter');
    expect(listingsFix.nativeElement.textContent).toContain('Fleet: 1/1 active vehicle(s)');

    const bookingsFix = TestBed.createComponent(ProviderBookings);
    bookingsFix.detectChanges();
    http.expectOne(`${API}/provider/listings?limit=100&offset=0`).flush([sampleScooterReview]);
    http.expectOne(`${API}/provider/bookings`).flush([
      {
        id: 88,
        listing_id: 301,
        traveler_id: 42,
        request_key: 'rent-key-0001',
        booking_reference: 'RENT-88',
        starts_at: '2027-02-01T09:00:00+05:30',
        ends_at: '2027-02-03T09:00:00+05:30',
        quantity: 1,
        total_amount: '5000.00',
        currency: 'LKR',
        status: 'pending',
        created_at: '2026-11-26T08:00:00Z',
        room_ids: [501],
        payments: [{ method: 'at_location', provider: 'at_location', status: 'unpaid' }],
        traveler_contact: { full_name: 'Nimali Silva', email: 'nimali@example.com', phone: null },
      },
    ]);
    bookingsFix.detectChanges();

    const text = bookingsFix.nativeElement.textContent as string;
    expect(text).toContain('RENT-88');
    expect(text).toContain('Pay at Location');
    expect(text).toContain('Unpaid');
    expect(text).toContain('2 day(s)');

    bookingsFix.componentInstance.promptAction(bookingsFix.componentInstance.bookings()[0], 'confirm');
    http.expectOne({ method: 'GET', url: `${API}/provider/bookings/88/commission-preview` }).flush({
      booking_amount: '5000.00',
      commission_rate: '0.10',
      required_commission: '0.00',
      free_booking_eligible: true,
      wallet_balance: '0.00',
      shortfall: '0.00',
      confirmation_allowed: true,
      currency: 'LKR',
    });
    bookingsFix.componentInstance.confirmAction();
    const patchBooking = http.expectOne({ method: 'PATCH', url: `${API}/bookings/88/status` });
    expect(patchBooking.request.body).toEqual({ to_status: 'confirmed', reason: null });
    patchBooking.flush({ status: 'confirmed' });
  });
});
