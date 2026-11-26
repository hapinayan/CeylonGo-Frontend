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
} from '../models/ai-planner.models';
import { AiPlannerService } from '../services/ai-planner.service';
import { AiBookingProposalCardComponent } from './ai-booking-proposal-card/ai-booking-proposal-card.component';
import { AiBudgetSummaryComponent } from './ai-budget-summary/ai-budget-summary.component';
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
});
