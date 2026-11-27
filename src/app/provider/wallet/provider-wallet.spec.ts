import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionPage, WalletSummary } from '../../core/models/wallet.models';
import { WalletService } from '../../core/services/wallet.service';
import { ProviderPreviewService } from '../provider-preview.service';
import { ProviderWallet } from './provider-wallet';

describe('ProviderWallet Component', () => {
  let component: ProviderWallet;
  let fixture: ComponentFixture<ProviderWallet>;

  const mockSummary: WalletSummary = {
    provider_id: 14,
    balance: '4500.00',
    currency: 'LKR',
    commission_rate: '0.10',
    free_bookings_used: 2,
    free_bookings_remaining: 1,
    total_top_ups: '5000.00',
    total_commission_deducted: '600.00',
    total_commission_refunded: '100.00',
    net_commission_paid: '500.00',
  };

  const mockTransactions: TransactionPage = {
    page: 1,
    page_size: 15,
    total: 2,
    items: [
      {
        id: 21,
        booking_id: 301,
        deduction_id: null,
        transaction_type: 'commission_deduction',
        amount: '500.00',
        balance_before: '5000.00',
        balance_after: '4500.00',
        commission_rate: '0.10',
        booking_amount: '5000.00',
        request_key: null,
        simulate_outcome: null,
        description: 'Booking commission deducted',
        created_at: '2026-11-27T08:30:00Z',
      },
      {
        id: 20,
        booking_id: null,
        deduction_id: null,
        transaction_type: 'top_up',
        amount: '5000.00',
        balance_before: '0.00',
        balance_after: '5000.00',
        commission_rate: null,
        booking_amount: null,
        request_key: '11111111-1111-4111-8111-111111111111',
        simulate_outcome: 'success',
        description: 'Simulated top-up succeeded',
        created_at: '2026-11-27T08:00:00Z',
      },
    ],
  };

  let walletServiceMock: {
    generateRequestKey: ReturnType<typeof vi.fn>;
    getWalletSummary: ReturnType<typeof vi.fn>;
    getTransactions: ReturnType<typeof vi.fn>;
    topUpWallet: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    walletServiceMock = {
      generateRequestKey: vi.fn().mockReturnValue('22222222-2222-4222-8222-222222222222'),
      getWalletSummary: vi.fn().mockReturnValue(of(mockSummary)),
      getTransactions: vi.fn().mockReturnValue(of(mockTransactions)),
      topUpWallet: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProviderWallet],
      providers: [
        provideRouter([]),
        { provide: WalletService, useValue: walletServiceMock },
        {
          provide: ProviderPreviewService,
          useValue: { isPreview: () => false, queryParams: () => ({}) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderWallet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('displays live backend wallet balance, free booking allowance, commission totals, and transactions', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('LKR 4,500.00');
    expect(el.textContent).toContain('10%');
    expect(el.textContent).toContain('2 of 3 Free Bookings Used');
    expect(el.textContent).toContain('1 remaining');
    expect(el.textContent).toContain('LKR 5,000.00');
    expect(el.textContent).toContain('LKR 500.00');
    expect(el.textContent).toContain('LKR 100.00');
    expect(el.textContent).toContain('TX-21');
    expect(el.textContent).toContain('Booking #301');
  });

  it('filters transactions by type and handles pagination', () => {
    component.onTypeFilterChange('commission_refund');
    expect(walletServiceMock.getTransactions).toHaveBeenCalledWith({
      page: 1,
      page_size: 15,
      transaction_type: 'commission_refund',
    });

    component.onPageChange(2);
    expect(walletServiceMock.getTransactions).toHaveBeenCalledWith({
      page: 2,
      page_size: 15,
      transaction_type: 'commission_refund',
    });
  });

  it('refreshes balance and transaction history after successful top-up', () => {
    component.onTopUpRecorded({
      success: true,
      currency: 'LKR',
      balance: '7000.00',
      message: 'Simulated top-up succeeded',
      transaction: mockTransactions.items[1],
    });

    expect(walletServiceMock.getWalletSummary).toHaveBeenCalledTimes(2);
    expect(walletServiceMock.getTransactions).toHaveBeenCalledTimes(2);
    expect(component.statusMessage()).toContain('LKR 7,000.00');
  });

  it('surfaces HTTP 403 authorization error cleanly without fake balance fallback', () => {
    walletServiceMock.getWalletSummary.mockReturnValueOnce(
      throwError(() => ({
        status: 403,
        error: { detail: 'An active approved provider account is required' },
      }))
    );
    component.summary.set(null);
    component.loadSummary();
    fixture.detectChanges();

    expect(component.summaryError()).toContain('approved provider');
    expect(component.summary()).toBeNull();
  });
});
