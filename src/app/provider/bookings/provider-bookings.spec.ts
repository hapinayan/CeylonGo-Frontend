import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderBookings } from './provider-bookings';
import { ProviderService } from '../../core/services/provider.service';
import { HomestayBookingDetails } from '../../core/models/provider.models';
import { WalletService } from '../../core/services/wallet.service';
import { CommissionPreview } from '../../core/models/wallet.models';

describe('ProviderBookings Component', () => {
  let component: ProviderBookings;
  let fixture: ComponentFixture<ProviderBookings>;

  const mockBookings: HomestayBookingDetails[] = [
    {
      id: 101,
      listing_id: 1,
      traveler_id: 201,
      request_key: 'req-abc-12345678',
      starts_at: '2026-12-01T14:00:00Z',
      ends_at: '2026-12-05T11:00:00Z',
      quantity: 2,
      total_amount: '18500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-20T10:00:00Z',
      room_ids: [10],
      payments: [{ status: 'completed', amount: '18500.00' }],
    },
    {
      id: 102,
      listing_id: 2,
      traveler_id: 202,
      request_key: 'req-def-87654321',
      starts_at: '2026-12-10T14:00:00Z',
      ends_at: '2026-12-12T11:00:00Z',
      quantity: 4,
      total_amount: '32000.00',
      currency: 'LKR',
      status: 'confirmed',
      created_at: '2026-11-21T11:00:00Z',
      room_ids: [20, 21],
      payments: [{ status: 'completed', amount: '32000.00' }],
    },
    {
      id: 103,
      listing_id: 3,
      traveler_id: 203,
      request_key: 'req-adv-55551111',
      booking_reference: 'CG-ADV-103',
      slot_id: 401,
      starts_at: '2026-12-15T08:00:00+05:30',
      ends_at: '2026-12-15T11:00:00+05:30',
      quantity: 3,
      total_amount: '25500.00',
      currency: 'LKR',
      status: 'confirmed',
      created_at: '2026-11-22T09:00:00Z',
      room_ids: [],
      payments: [{ status: 'unpaid', provider: 'pay_at_location', amount: '25500.00' }],
      traveler_contact: {
        full_name: 'Nimali Perera',
        email: 'nimali@example.com',
        phone: '+94771234567',
      },
    },
  ];

  let providerServiceMock: {
    getProviderBookings: ReturnType<typeof vi.fn>;
    getProviderListings: ReturnType<typeof vi.fn>;
    getProviderBooking: ReturnType<typeof vi.fn>;
    updateBookingStatus: ReturnType<typeof vi.fn>;
  };

  let walletServiceMock: {
    getBookingCommissionPreview: ReturnType<typeof vi.fn>;
    generateRequestKey: ReturnType<typeof vi.fn>;
    topUpWallet: ReturnType<typeof vi.fn>;
  };

  const allowedPreview: CommissionPreview = {
    booking_amount: '18500.00',
    commission_rate: '0.10',
    required_commission: '1850.00',
    free_booking_eligible: false,
    wallet_balance: '5000.00',
    shortfall: '0.00',
    confirmation_allowed: true,
    currency: 'LKR',
  };

  beforeEach(async () => {
    providerServiceMock = {
      getProviderBookings: vi.fn().mockReturnValue(of(mockBookings)),
      getProviderListings: vi.fn().mockReturnValue(
        of([
          {
            listing: {
              id: 3,
              provider_id: 10,
              category: 'adventure',
              title: 'Sigiriya Pidurangala Sunrise Trek',
              description: 'Sunrise guided climb',
              district: 'Matale',
              locality: 'Sigiriya',
              price: '8500.00',
              currency: 'LKR',
              approval_status: 'approved',
              is_active: true,
              media: [],
              units: [],
              created_at: '2026-11-15T09:00:00Z',
            },
            verification_status: 'approved',
            submitted_at: null,
            decided_at: null,
            decision_reason: null,
            details: {},
            homestay_metadata: null,
            rooms: [],
          },
        ])
      ),
      getProviderBooking: vi.fn().mockImplementation((id: number) =>
        of(mockBookings.find((b) => b.id === id) || null)
      ),
      updateBookingStatus: vi.fn().mockImplementation(
        (id: number, payload: { to_status: string }) => of({ id, status: payload.to_status })
      ),
    };

    walletServiceMock = {
      getBookingCommissionPreview: vi.fn().mockReturnValue(of(allowedPreview)),
      generateRequestKey: vi.fn().mockReturnValue('33333333-3333-4333-8333-333333333333'),
      topUpWallet: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderBookings],
      providers: [
        provideRouter([]),
        { provide: ProviderService, useValue: providerServiceMock },
        { provide: WalletService, useValue: walletServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderBookings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load bookings on init', () => {
    expect(component).toBeTruthy();
    expect(providerServiceMock.getProviderBookings).toHaveBeenCalled();
    expect(component.bookings().length).toBe(3);
    expect(component.isLoading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.page-title')?.textContent).toContain('Provider Booking Management');
    expect(compiled.textContent).toContain('#101');
    expect(compiled.textContent).toContain('#102');
    expect(compiled.textContent).toContain('CG-ADV-103');
    expect(compiled.textContent).toContain('Sigiriya Pidurangala Sunrise Trek');
    expect(compiled.textContent).toContain('Nimali Perera');
    expect(compiled.textContent).toContain('Pay at Location');
    expect(compiled.textContent).toContain('Unpaid');
  });

  it('should filter bookings by tab', () => {
    component.onFilterChange('pending');
    expect(providerServiceMock.getProviderBookings).toHaveBeenCalledWith('pending');
  });

  it('should search bookings by ID and request key', () => {
    component.searchQuery.set('101');
    const filtered = component.filteredBookings();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe(101);

    component.searchQuery.set('req-def');
    const filteredKey = component.filteredBookings();
    expect(filteredKey.length).toBe(1);
    expect(filteredKey[0].id).toBe(102);
  });

  it('should open confirm modal and update booking to confirmed', () => {
    const booking = mockBookings[0];
    component.promptAction(booking, 'confirm');

    expect(component.isActionModalOpen()).toBe(true);
    expect(component.activeBooking()?.id).toBe(101);
    expect(component.actionType()).toBe('confirm');

    component.confirmAction();

    expect(providerServiceMock.updateBookingStatus).toHaveBeenCalledWith(101, {
      to_status: 'confirmed',
      reason: null,
    });
    expect(component.bookings().find((b) => b.id === 101)?.status).toBe('confirmed');
    expect(component.isActionModalOpen()).toBe(false);
  });

  it('should open reject modal, set reason, and update booking to rejected', () => {
    const booking = mockBookings[0];
    component.promptAction(booking, 'reject');
    component.rejectReason = 'Fully booked on those dates';

    expect(component.actionType()).toBe('reject');

    component.confirmAction();

    expect(providerServiceMock.updateBookingStatus).toHaveBeenCalledWith(101, {
      to_status: 'rejected',
      reason: 'Fully booked on those dates',
    });
    expect(component.bookings().find((b) => b.id === 101)?.status).toBe('rejected');
  });

  it('should handle error when loading bookings', () => {
    providerServiceMock.getProviderBookings.mockReturnValueOnce(
      throwError(() => new Error('Server error'))
    );
    component.loadBookings();

    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toContain('Failed to load reservations');
  });

  it('should mark confirmed adventure booking completed and handle inline cancel errors', () => {
    const adventureBooking = mockBookings[2];
    component.promptAction(adventureBooking, 'complete');
    component.confirmAction();

    expect(providerServiceMock.updateBookingStatus).toHaveBeenCalledWith(103, {
      to_status: 'completed',
      reason: null,
    });
    expect(component.bookings().find((b) => b.id === 103)?.status).toBe('completed');

    component.promptAction(adventureBooking, 'cancel');
    component.rejectReason = 'Severe storm warning';
    providerServiceMock.updateBookingStatus.mockReturnValueOnce(
      throwError(() => ({ error: { detail: 'Cannot cancel completed booking' } }))
    );
    component.confirmAction();
    expect(component.actionErrorMessage()).toBe('Cannot cancel completed booking');
  });

  it('identifies tour guide bookings, package titles, and Pay at Location unpaid status', () => {
    const guideBooking: HomestayBookingDetails = {
      id: 104,
      listing_id: 41,
      traveler_id: 204,
      request_key: 'req-guide-104',
      booking_reference: 'GUIDE-104',
      slot_id: 72,
      starts_at: '2027-03-15T09:00:00+05:30',
      ends_at: '2027-03-15T11:00:00+05:30',
      quantity: 2,
      total_amount: '4500.00',
      currency: 'LKR',
      status: 'pending',
      created_at: '2026-11-26T08:00:00Z',
      room_ids: [23],
      payments: [{ status: 'unpaid', method: 'at_location', amount: '4500.00' }],
    };

    component.listingsMap.update((curr) => ({
      ...curr,
      41: {
        listing: {
          id: 41,
          provider_id: 10,
          category: 'guide',
          title: 'Nadee Fernando — Ella Guide',
          description: 'Guide',
          district: 'Badulla',
          locality: 'Ella',
          price: '4500.00',
          currency: 'LKR',
          approval_status: 'approved',
          is_active: true,
          media: [],
          units: [{ id: 23, label: 'Ella Heritage Walk', capacity: 6, is_active: true }],
          created_at: '2026-11-26T08:00:00Z',
        },
        verification_status: 'approved',
        submitted_at: null,
        decided_at: null,
        decision_reason: null,
        details: {
          packages: [{ id: 23, title: 'Ella Heritage Walk' }],
        },
        homestay_metadata: null,
        rooms: [],
      },
    }));
    component.bookings.update((curr) => [guideBooking, ...curr]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('GUIDE-104');
    expect(compiled.textContent).toContain('Tour Package: Ella Heritage Walk');
    expect(compiled.textContent).toContain('Pay at Location');
    expect(compiled.textContent).toContain('Unpaid');
  });

  it('displays commission preview breakdown and remaining balance before confirming', () => {
    const booking = mockBookings[0];
    component.promptAction(booking, 'confirm');
    fixture.detectChanges();

    expect(walletServiceMock.getBookingCommissionPreview).toHaveBeenCalledWith(101);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Wallet & Commission Preview');
    expect(el.textContent).toContain('LKR 18,500.00');
    expect(el.textContent).toContain('10%');
    expect(el.textContent).toContain('LKR 1,850.00');
    expect(el.textContent).toContain('LKR 5,000.00');
    expect(el.textContent).toContain('LKR 3,150.00');
  });

  it('clearly displays commission-free booking eligibility benefit', () => {
    walletServiceMock.getBookingCommissionPreview.mockReturnValueOnce(
      of({
        booking_amount: '18500.00',
        commission_rate: '0.10',
        required_commission: '0.00',
        free_booking_eligible: true,
        wallet_balance: '0.00',
        shortfall: '0.00',
        confirmation_allowed: true,
        currency: 'LKR',
      })
    );

    component.promptAction(mockBookings[0], 'confirm');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Commission-Free Booking Eligible');
    expect(el.textContent).toContain('Eligible (Free)');
  });

  it('blocks confirmation on insufficient balance, opens top-up recovery, and refreshes preview on top-up', () => {
    walletServiceMock.getBookingCommissionPreview.mockReturnValueOnce(
      of({
        booking_amount: '18500.00',
        commission_rate: '0.10',
        required_commission: '1850.00',
        free_booking_eligible: false,
        wallet_balance: '500.00',
        shortfall: '1350.00',
        confirmation_allowed: false,
        currency: 'LKR',
      })
    );

    component.promptAction(mockBookings[0], 'confirm');
    fixture.detectChanges();

    expect(component.hasInsufficientBalance()).toBe(true);
    expect(component.requiredTopupAmount()).toBe(1350);

    // Attempting to confirm keeps booking pending and does not call updateBookingStatus
    component.confirmAction();
    expect(providerServiceMock.updateBookingStatus).not.toHaveBeenCalled();
    expect(component.bookings().find((b) => b.id === 101)?.status).toBe('pending');

    // Open Top Up Wallet from booking modal and simulate top-up completion
    component.openTopupFromBooking();
    expect(component.isTopupModalOpen()).toBe(true);

    walletServiceMock.getBookingCommissionPreview.mockReturnValueOnce(of(allowedPreview));
    component.onBookingTopUpSucceeded({
      success: true,
      currency: 'LKR',
      balance: '5000.00',
      message: 'Simulated top-up succeeded',
      transaction: {
        id: 1,
        booking_id: null,
        deduction_id: null,
        transaction_type: 'top_up',
        amount: '4500.00',
        balance_before: '500.00',
        balance_after: '5000.00',
        commission_rate: null,
        booking_amount: null,
        request_key: '33333333-3333-4333-8333-333333333333',
        simulate_outcome: 'success',
        description: 'Simulated top-up succeeded',
        created_at: '2026-11-27T08:00:00Z',
      },
    });
    fixture.detectChanges();

    expect(component.isTopupModalOpen()).toBe(false);
    expect(component.hasInsufficientBalance()).toBe(false);

    // Retry confirmation now succeeds
    component.confirmAction();
    expect(providerServiceMock.updateBookingStatus).toHaveBeenCalledWith(101, {
      to_status: 'confirmed',
      reason: null,
    });
    expect(component.bookings().find((b) => b.id === 101)?.status).toBe('confirmed');
  });

  it('keeps booking pending and prompts top-up if backend returns 409 insufficient_wallet_balance', () => {
    component.promptAction(mockBookings[0], 'confirm');
    providerServiceMock.updateBookingStatus.mockReturnValueOnce(
      throwError(() => ({
        status: 409,
        error: {
          detail: {
            code: 'insufficient_wallet_balance',
            message: 'Top up your wallet before confirming this booking.',
            currency: 'LKR',
            current_balance: '0.00',
            required_commission: '1850.00',
            shortfall: '1850.00',
          },
        },
      }))
    );

    component.confirmAction();
    expect(component.bookings().find((b) => b.id === 101)?.status).toBe('pending');
    expect(component.insufficientBalance()?.shortfall).toBe('1850.00');
    expect(component.actionErrorMessage()).toContain('Top up your wallet');
  });
});
