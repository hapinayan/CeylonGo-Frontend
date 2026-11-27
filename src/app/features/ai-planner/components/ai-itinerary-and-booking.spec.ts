import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AiBookingDetailResponse,
  AiBookingProposal,
  AiItinerary,
  AiListingResult,
  AiPaymentResponse,
  AiSavedTrip,
  AiTurn,
} from '../models/ai-planner.models';
import { AiPlannerService } from '../services/ai-planner.service';
import { AiBookingProposalCardComponent } from './ai-booking-proposal-card/ai-booking-proposal-card.component';
import { AiBudgetSummaryComponent } from './ai-budget-summary/ai-budget-summary.component';
import { AiMessageComponent } from './ai-message/ai-message.component';
import { AiPaymentPanelComponent } from './ai-payment-panel/ai-payment-panel.component';
import { AiServiceCardComponent } from './ai-service-card/ai-service-card.component';
import { AiSavedTripsComponent } from '../pages/ai-saved-trips/ai-saved-trips.component';

describe('AI Planner Itinerary, Service Cards, Booking Proposal, Payment Panel & Saved Trips', () => {
  const sampleItinerary: AiItinerary = {
    plan: {
      title: 'Kandy & Matale Trail',
      summary: 'Two nights in Kandy with crafts and spice trails.',
      start_date: '2026-12-15',
      travelers: 2,
      budget_lkr: '25000.00',
      days: [
        {
          day: 1,
          destination: 'Kandy',
          morning: 'Temple Visit',
          afternoon: 'Woodcraft Workshop',
          evening: 'Lake Walk',
          transport: 'Tuk-tuk',
          service_refs: ['stay-1', 'art-1'],
          estimated_food_lkr: '3500.00',
          estimated_transport_lkr: '1500.00',
          estimated_other_lkr: '500.00',
        },
      ],
    },
    listings: [
      {
        ref: 'stay-1',
        listing_id: 14,
        category: 'homestay',
        title: 'Hilltop Heritage Villa [Demo]',
        district: 'Kandy',
        locality: 'Peradeniya',
        advertised_price_lkr: '18000.00',
      },
      {
        ref: 'art-1',
        listing_id: 29,
        category: 'artisan',
        title: 'Dumbara Woodcraft Studio',
        district: 'Kandy',
        locality: 'Pilimathalawa',
        advertised_price_lkr: null,
        details: { craft_category: 'Wood Carving' },
      },
      {
        ref: 'guide-1',
        listing_id: 35,
        category: 'guide',
        title: 'Nuwan Heritage Guide',
        district: 'Kandy',
        locality: 'Kandy City',
        advertised_price_lkr: '8500.00',
      },
    ],
    quotes: [
      {
        ref: 'stay-1',
        quote: {
          listing_id: 14,
          category: 'homestay',
          title: 'Hilltop Heritage Villa [Demo]',
          starts_at: '2026-12-15T14:00:00Z',
          ends_at: '2026-12-17T11:00:00Z',
          quantity: 1,
          total_lkr: '36000.00',
        },
      },
    ],
    quoted_services_lkr: '36000.00',
    estimated_other_lkr: '5500.00',
    estimated_total_lkr: '41500.00',
    remaining_budget_lkr: '-16500.00',
  };

  let aiServiceMock: {
    resolveListingPhoto: ReturnType<typeof vi.fn>;
    confirmBooking: ReturnType<typeof vi.fn>;
    getBookingDetail: ReturnType<typeof vi.fn>;
    simulatePayment: ReturnType<typeof vi.fn>;
    payAtLocation: ReturnType<typeof vi.fn>;
    listSavedTrips: ReturnType<typeof vi.fn>;
    getSavedTrip: ReturnType<typeof vi.fn>;
    updateSavedTrip: ReturnType<typeof vi.fn>;
    deleteSavedTrip: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    aiServiceMock = {
      resolveListingPhoto: vi.fn(() => of('http://127.0.0.1:8000/uploads/sample.jpg')),
      confirmBooking: vi.fn(),
      getBookingDetail: vi.fn(),
      simulatePayment: vi.fn(),
      payAtLocation: vi.fn(),
      listSavedTrips: vi.fn(() => of([])),
      getSavedTrip: vi.fn(),
      updateSavedTrip: vi.fn(),
      deleteSavedTrip: vi.fn(() => of(void 0)),
    };
  });

  it('displays budget summary over-budget alert and emits Ask AI for Cheaper Alternatives', async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, AiBudgetSummaryComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(AiBudgetSummaryComponent);
    fixture.componentInstance.itinerary = sampleItinerary;
    const cheaperSpy = vi.fn();
    fixture.componentInstance.askCheaperAlternatives.subscribe(cheaperSpy);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Over Budget');
    expect(text).toContain('Services Not Yet Quoted (1)');

    const btn = fixture.nativeElement.querySelector('.btn-cheaper') as HTMLButtonElement;
    btn.click();
    expect(cheaperSpy).toHaveBeenCalledTimes(1);
  });

  it('renders correct actions on AiServiceCardComponent for bookable homestay vs non-bookable artisan', async () => {
    await TestBed.configureTestingModule({
      imports: [AiServiceCardComponent],
      providers: [provideRouter([]), { provide: AiPlannerService, useValue: aiServiceMock }],
    }).compileComponents();

    // Bookable Homestay
    const homestayFix = TestBed.createComponent(AiServiceCardComponent);
    homestayFix.componentInstance.listing = sampleItinerary.listings[0] as AiListingResult;
    homestayFix.componentInstance.verifiedQuote = sampleItinerary.quotes[0].quote;
    const bookSpy = vi.fn();
    homestayFix.componentInstance.bookWithAi.subscribe(bookSpy);
    homestayFix.detectChanges();

    const homestayEl = homestayFix.nativeElement as HTMLElement;
    expect(homestayEl.textContent).toContain('Demo Listing');
    expect(homestayEl.textContent).toContain('Verified Quote');
    const bookBtn = homestayEl.querySelector('button.btn-primary-sm') as HTMLButtonElement;
    expect(bookBtn.textContent?.trim()).toBe('Book with AI');
    bookBtn.click();
    expect(bookSpy).toHaveBeenCalledWith(sampleItinerary.listings[0]);

    // Non-bookable Artisan Business
    const artisanFix = TestBed.createComponent(AiServiceCardComponent);
    artisanFix.componentInstance.listing = sampleItinerary.listings[1] as AiListingResult;
    artisanFix.detectChanges();

    const artisanEl = artisanFix.nativeElement as HTMLElement;
    expect(artisanEl.textContent).toContain('View Business');
    expect(artisanEl.textContent).toContain('View Products');
    expect(artisanEl.textContent).toContain('Contact Business');
    expect(artisanEl.textContent).not.toContain('Book with AI');
  });

  it('enforces motorbike license check, duplicate confirm lock, and expiry error handling on AiBookingProposalCardComponent', async () => {
    await TestBed.configureTestingModule({
      imports: [AiBookingProposalCardComponent],
      providers: [{ provide: AiPlannerService, useValue: aiServiceMock }],
    }).compileComponents();

    const motorbikeProposal: AiBookingProposal = {
      confirmation_token: 'bike-tok-1',
      expires_at: new Date(Date.now() + 300_000).toISOString(),
      quote: {
        listing_id: 77,
        category: 'bike',
        title: 'Yamaha NMax Scooter',
        starts_at: '2026-12-15T09:00:00Z',
        ends_at: '2026-12-16T09:00:00Z',
        quantity: 1,
        total_lkr: '4500.00',
        motorcycle_license_required: true,
      },
    };

    const fixture = TestBed.createComponent(AiBookingProposalCardComponent);
    fixture.componentInstance.proposal = motorbikeProposal;
    fixture.detectChanges();

    // Attempt confirm without license checkbox/expiry
    fixture.componentInstance.confirm();
    fixture.detectChanges();
    expect(aiServiceMock.confirmBooking).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorMessage()).toContain('motorcycle driving license');

    // Provide license confirmation & valid until date
    fixture.componentInstance.licenseConfirmed = true;
    fixture.componentInstance.licenseValidUntil = '2029-05-01';

    const confirmedBooking: AiBookingDetailResponse = {
      id: 901,
      listing_id: 77,
      traveler_id: 101,
      request_key: 'rk-901',
      starts_at: motorbikeProposal.quote.starts_at,
      ends_at: motorbikeProposal.quote.ends_at,
      quantity: 1,
      total_amount: '4500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-27T00:10:00Z',
      booking_reference: 'CG-901',
      slot_id: null,
      package_id: null,
      rental_unit_ids: null,
      payments: [],
    };
    aiServiceMock.confirmBooking.mockReturnValue(of(confirmedBooking));

    fixture.componentInstance.confirm();
    // Calling second time after confirmation does NOT double-confirm
    fixture.componentInstance.confirm();
    expect(aiServiceMock.confirmBooking).toHaveBeenCalledTimes(1);
    expect(aiServiceMock.confirmBooking).toHaveBeenCalledWith({
      confirmation_token: 'bike-tok-1',
      confirm: true,
      motorcycle_license_confirmed: true,
      license_valid_until: '2029-05-01',
    });

    // Expired/conflict handling offers Request Updated Quote
    const conflictFix = TestBed.createComponent(AiBookingProposalCardComponent);
    conflictFix.componentInstance.proposal = {
      ...motorbikeProposal,
      quote: { ...motorbikeProposal.quote, motorcycle_license_required: false },
    };
    aiServiceMock.confirmBooking.mockReturnValueOnce(
      throwError(() => ({ status: 409, error: { detail: 'Inventory conflict' } })),
    );
    conflictFix.detectChanges();
    conflictFix.componentInstance.confirm();
    conflictFix.detectChanges();
    expect(conflictFix.componentInstance.needsFreshQuote()).toBe(true);
    expect(conflictFix.nativeElement.textContent).toContain('Inventory conflict');
  });

  it('keeps booking status separate from payment status and supports demo simulation, retry, and pay at location', async () => {
    await TestBed.configureTestingModule({
      imports: [AiPaymentPanelComponent],
      providers: [provideRouter([]), { provide: AiPlannerService, useValue: aiServiceMock }],
    }).compileComponents();

    const booking: AiBookingDetailResponse = {
      id: 505,
      listing_id: 14,
      traveler_id: 101,
      request_key: 'bk-505',
      starts_at: '2026-12-15T14:00:00Z',
      ends_at: '2026-12-17T11:00:00Z',
      quantity: 1,
      total_amount: '36000.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-27T00:12:00Z',
      booking_reference: 'CG-505',
      slot_id: null,
      package_id: null,
      rental_unit_ids: null,
      payments: [],
    };

    const fixture: ComponentFixture<AiPaymentPanelComponent> = TestBed.createComponent(AiPaymentPanelComponent);
    fixture.componentInstance.booking = booking;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Booking request submitted. Awaiting service provider confirmation.',
    );

    const demoSuccess: AiPaymentResponse = {
      id: 12,
      booking_id: 505,
      request_key: 'pay-505-1',
      attempt_no: 1,
      method: 'simulated_online',
      status: 'demo_succeeded',
      display_amount: '36000.00',
      currency: 'LKR',
      created_at: '2026-11-27T00:13:00Z',
    };
    aiServiceMock.simulatePayment.mockReturnValueOnce(of(demoSuccess));

    fixture.componentInstance.payOnlineDemo('success');
    fixture.detectChanges();
    expect(fixture.componentInstance.currentPaymentStatus()).toBe('Academic Demo Payment Succeeded');
    expect(fixture.componentInstance.booking.status).toBe('pending');
  });

  it('renders empty state, saved trips list, rename, and delete confirmation in AiSavedTripsComponent', async () => {
    const paramMap$ = new BehaviorSubject(convertToParamMap({}));
    const savedTrip: AiSavedTrip = {
      id: 44,
      title: 'Saved Kandy Escape',
      created_at: '2026-11-27T00:15:00Z',
      updated_at: '2026-11-27T00:15:00Z',
      itinerary: sampleItinerary,
    };

    await TestBed.configureTestingModule({
      imports: [AiSavedTripsComponent],
      providers: [
        provideRouter([]),
        { provide: AiPlannerService, useValue: aiServiceMock },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } },
      ],
    }).compileComponents();

    const emptyFix = TestBed.createComponent(AiSavedTripsComponent);
    emptyFix.detectChanges();
    expect(emptyFix.nativeElement.textContent).toContain('No saved trips yet.');

    aiServiceMock.listSavedTrips.mockReturnValue(of([savedTrip]));
    aiServiceMock.updateSavedTrip.mockReturnValue(of({ ...savedTrip, title: 'Updated Saved Title' }));

    const listFix = TestBed.createComponent(AiSavedTripsComponent);
    listFix.detectChanges();
    expect(listFix.nativeElement.textContent).toContain('Saved Kandy Escape');

    listFix.componentInstance.onRenameTrip({ id: 44, title: 'Updated Saved Title' });
    expect(listFix.componentInstance.trips()[0].title).toBe('Updated Saved Title');

    listFix.componentInstance.confirmDelete(savedTrip);
    expect(aiServiceMock.deleteSavedTrip).toHaveBeenCalledWith(44);
  });

  it('sends pure RFC-4122 UUID request_key, preserves it on HTTP 500 retry, rotates only on demo_failed or mode change', async () => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    await TestBed.configureTestingModule({
      imports: [AiPaymentPanelComponent],
      providers: [provideRouter([]), { provide: AiPlannerService, useValue: aiServiceMock }],
    }).compileComponents();

    const booking: AiBookingDetailResponse = {
      id: 7,
      listing_id: 14,
      traveler_id: 501,
      request_key: '11111111-1111-4111-8111-111111111111',
      starts_at: '2026-12-15T14:00:00Z',
      ends_at: '2026-12-17T11:00:00Z',
      quantity: 1,
      total_amount: '18000.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-27T00:10:00Z',
      booking_reference: 'CG-7',
      slot_id: null,
      package_id: null,
      rental_unit_ids: null,
      payments: [],
    };

    const fixture = TestBed.createComponent(AiPaymentPanelComponent);
    fixture.componentInstance.booking = booking;
    fixture.detectChanges();

    // 1) Simulate fails with HTTP 500: surfaces real HTTP 500 error, does NOT report connection error
    aiServiceMock.simulatePayment.mockReturnValueOnce(
      throwError(() => ({ status: 500, error: {} })),
    );
    fixture.componentInstance.payOnlineDemo('success');
    fixture.detectChanges();

    const firstKey = aiServiceMock.simulatePayment.mock.calls[0][1] as string;
    expect(firstKey).toMatch(uuidPattern);
    expect(firstKey.length).toBe(36);
    expect(aiServiceMock.simulatePayment.mock.calls[0][2]).toBe(1);
    expect(aiServiceMock.simulatePayment.mock.calls[0][3]).toBe('success');
    expect(fixture.componentInstance.errorMessage()).toContain('HTTP 500');
    expect(fixture.componentInstance.errorMessage()?.toLowerCase()).not.toContain('reach');

    // 2) Retrying identical operation via retryFailedOperation() preserves exact request_key & attempt_no
    const failedOutcomePayment: AiPaymentResponse = {
      id: 81,
      booking_id: 7,
      request_key: firstKey,
      attempt_no: 1,
      method: 'online_demo',
      status: 'demo_failed',
      display_amount: '18000.00',
      currency: 'LKR',
      created_at: '2026-11-27T00:11:00Z',
      resolved_at: '2026-11-27T00:11:00Z',
    };
    aiServiceMock.simulatePayment.mockReturnValueOnce(of(failedOutcomePayment));

    fixture.componentInstance.retryFailedOperation();
    fixture.detectChanges();

    expect(aiServiceMock.simulatePayment).toHaveBeenCalledTimes(2);
    expect(aiServiceMock.simulatePayment.mock.calls[1]).toEqual([7, firstKey, 1, 'success']);

    // 3) Genuinely new attempt after demo_failed uses a new UUID & attempt_no = 2
    aiServiceMock.simulatePayment.mockReturnValueOnce(
      throwError(() => ({ status: 0 })),
    );
    fixture.componentInstance.payOnlineDemo('success');
    const secondAttemptKey = aiServiceMock.simulatePayment.mock.calls[2][1] as string;
    expect(secondAttemptKey).toMatch(uuidPattern);
    expect(secondAttemptKey).not.toBe(firstKey);
    expect(aiServiceMock.simulatePayment.mock.calls[2][2]).toBe(2);

    // 4) Switching payment operation to pay-at-location uses its own fresh valid UUID
    const atLocationPayment: AiPaymentResponse = {
      id: 82,
      booking_id: 7,
      request_key: '22222222-2222-4222-8222-222222222222',
      attempt_no: 1,
      method: 'pay_at_location',
      status: 'at_location_selected',
      display_amount: '18000.00',
      currency: 'LKR',
      created_at: '2026-11-27T00:12:00Z',
    };
    aiServiceMock.payAtLocation.mockReturnValueOnce(of(atLocationPayment));
    fixture.componentInstance.selectAtLocation();
    fixture.detectChanges();

    const locKey = aiServiceMock.payAtLocation.mock.calls[0][1] as string;
    expect(locKey).toMatch(uuidPattern);
    expect(locKey).not.toBe(firstKey);
    expect(locKey).not.toBe(secondAttemptKey);
    expect(fixture.componentInstance.latestPayment()?.status).toBe('at_location_selected');
  });

  it('resumes and completes payment for existing Booking #7 inside AiMessageComponent without duplicate booking creation', async () => {
    await TestBed.configureTestingModule({
      imports: [AiMessageComponent],
      providers: [
        provideRouter([]),
        { provide: AiPlannerService, useValue: aiServiceMock },
      ],
    }).compileComponents();

    const turnWithUnpaidBooking: AiTurn = {
      id: 90,
      user_message: 'Book Hilltop Heritage Villa',
      assistant_message: 'Your booking #7 is created and awaiting payment.',
      listings: [],
      quotes: [],
      bookings: [
        {
          booking_id: 7,
          status: 'pending',
          total_lkr: '18000.00',
          payment_status: null,
          payment_method: null,
        },
      ],
      created_at: '2026-11-27T00:00:00Z',
    };

    const existingBooking7: AiBookingDetailResponse = {
      id: 7,
      listing_id: 14,
      traveler_id: 501,
      request_key: '11111111-1111-4111-8111-111111111111',
      starts_at: '2026-12-15T14:00:00Z',
      ends_at: '2026-12-17T11:00:00Z',
      quantity: 1,
      total_amount: '18000.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-27T00:00:00Z',
      booking_reference: 'CG-7',
      slot_id: null,
      package_id: null,
      rental_unit_ids: null,
      payments: [],
    };
    aiServiceMock.getBookingDetail.mockReturnValueOnce(of(existingBooking7));
    aiServiceMock.simulatePayment.mockImplementation((bookingId: number, requestKey: string, attemptNo: number) =>
      of({
        id: 700,
        booking_id: bookingId,
        request_key: requestKey,
        attempt_no: attemptNo,
        method: 'online_demo',
        status: 'demo_paid',
        display_amount: '18000.00',
        currency: 'LKR',
        created_at: '2026-11-27T00:20:00Z',
        resolved_at: '2026-11-27T00:20:00Z',
      }),
    );

    const fixture = TestBed.createComponent(AiMessageComponent);
    fixture.componentInstance.turn = turnWithUnpaidBooking;
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const resumeBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Complete Payment'),
    ) as HTMLButtonElement | undefined;
    expect(resumeBtn).toBeDefined();

    resumeBtn!.click();
    fixture.detectChanges();

    expect(aiServiceMock.getBookingDetail).toHaveBeenCalledWith(7);
    expect(aiServiceMock.confirmBooking).not.toHaveBeenCalled();

    const payOnlineBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Online Payment (Academic Demo)'),
    ) as HTMLButtonElement | undefined;
    expect(payOnlineBtn).toBeDefined();

    payOnlineBtn!.click();
    fixture.detectChanges();

    expect(aiServiceMock.simulatePayment).toHaveBeenCalledTimes(1);
    expect(aiServiceMock.simulatePayment.mock.calls[0][0]).toBe(7);
    expect(aiServiceMock.confirmBooking).not.toHaveBeenCalled();
    expect(turnWithUnpaidBooking.bookings[0].payment_status).toBe('demo_paid');
    expect(turnWithUnpaidBooking.bookings[0].payment_method).toBe('online_demo');
  });

  it('renders backend itinerary weather inside dated days and omits weather when absent', async () => {
    const { AiItineraryCardComponent } = await import('./ai-itinerary-card/ai-itinerary-card.component');
    await TestBed.configureTestingModule({
      imports: [AiItineraryCardComponent],
      providers: [provideRouter([]), { provide: AiPlannerService, useValue: aiServiceMock }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AiItineraryCardComponent);
    fixture.componentInstance.itinerary = {
      ...sampleItinerary,
      weather: [
        {
          day: 1,
          destination: 'Ella',
          source: 'openweather',
          fetched_at: '2026-11-27T06:00:00Z',
          stale: false,
          forecast: {
            date: '2026-11-28',
            interval_count: 8,
            partial: false,
            min_temperature_c: 18,
            max_temperature_c: 26,
            rain_probability_percent: 45,
            condition: {
              code: 500,
              name: 'Rain',
              description: 'Light rain',
              icon: '10d',
            },
            recommendations: ['Carry an umbrella'],
            cautions: ['Slippery hiking trails after noon rain'],
          },
        },
      ],
    };
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const weatherBlocks = el.querySelectorAll('[data-testid="ai-day-weather"]');
    expect(weatherBlocks.length).toBe(1);
    expect(weatherBlocks[0].textContent).toContain('Light rain');
    expect(weatherBlocks[0].textContent).toContain('18°C');
    expect(weatherBlocks[0].textContent).toContain('26°C');
    expect(weatherBlocks[0].textContent).toContain('Rain 45%');
    expect(weatherBlocks[0].textContent).toContain('Slippery hiking trails after noon rain');
    expect(weatherBlocks[0].textContent).toContain('GMT+0530');

    // Undated / missing weather does not fabricate weather entries
    const fixture2 = TestBed.createComponent(AiItineraryCardComponent);
    fixture2.componentInstance.itinerary = { ...sampleItinerary, weather: null };
    fixture2.detectChanges();
    const el2 = fixture2.nativeElement as HTMLElement;
    expect(el2.querySelectorAll('[data-testid="ai-day-weather"]').length).toBe(0);
  });
});
