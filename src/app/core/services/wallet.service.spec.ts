import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { ProviderPreviewService } from '../../provider/provider-preview.service';
import { parseWalletApiError } from '../models/wallet.models';
import { ProviderAuthService } from './provider-auth.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ProviderAuthService,
          useValue: { getToken: vi.fn().mockReturnValue('provider-jwt-token') },
        },
        {
          provide: ProviderPreviewService,
          useValue: { isPreview: () => false },
        },
      ],
    });
    service = TestBed.inject(WalletService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('generates canonical lowercase hyphenated UUID v4 request keys', () => {
    const key = service.generateRequestKey();
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(key).toBe(key.toLowerCase());
  });

  it('calls provider wallet summary, top-up, transactions, and commission-preview endpoints', async () => {
    const summaryPromise = firstValueFrom(service.getWalletSummary());
    const summaryReq = httpMock.expectOne(`${environment.apiBaseUrl}/provider/wallet`);
    expect(summaryReq.request.method).toBe('GET');
    expect(summaryReq.request.headers.get('Authorization')).toBe('Bearer provider-jwt-token');
    summaryReq.flush({
      provider_id: 7,
      balance: '1000.00',
      currency: 'LKR',
      commission_rate: '0.10',
      free_bookings_used: 1,
      free_bookings_remaining: 2,
      total_top_ups: '1000.00',
      total_commission_deducted: '0.00',
      total_commission_refunded: '0.00',
      net_commission_paid: '0.00',
    });
    const summary = await summaryPromise;
    expect(summary.balance).toBe('1000.00');

    const key = service.generateRequestKey();
    const topupPromise = firstValueFrom(
      service.topUpWallet({ amount: '2500.00', request_key: key, simulate_outcome: 'success' })
    );
    const topupReq = httpMock.expectOne(`${environment.apiBaseUrl}/provider/wallet/top-up`);
    expect(topupReq.request.method).toBe('POST');
    expect(topupReq.request.body).toEqual({
      amount: '2500.00',
      request_key: key,
      simulate_outcome: 'success',
    });
    topupReq.flush({
      success: true,
      currency: 'LKR',
      balance: '3500.00',
      message: 'Simulated top-up succeeded',
      transaction: {
        id: 1,
        booking_id: null,
        deduction_id: null,
        transaction_type: 'top_up',
        amount: '2500.00',
        balance_before: '1000.00',
        balance_after: '3500.00',
        commission_rate: null,
        booking_amount: null,
        request_key: key,
        simulate_outcome: 'success',
        description: 'Simulated top-up succeeded',
        created_at: '2026-11-27T08:00:00Z',
      },
    });
    const topupRes = await topupPromise;
    expect(topupRes.success).toBe(true);

    const txPromise = firstValueFrom(
      service.getTransactions({ page: 2, page_size: 15, transaction_type: 'commission_refund' })
    );
    const txReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/provider/wallet/transactions?page=2&page_size=15&transaction_type=commission_refund`
    );
    expect(txReq.request.method).toBe('GET');
    txReq.flush({ page: 2, page_size: 15, total: 1, items: [] });
    await txPromise;

    const previewPromise = firstValueFrom(service.getBookingCommissionPreview(88));
    const previewReq = httpMock.expectOne(
      `${environment.apiBaseUrl}/provider/bookings/88/commission-preview`
    );
    expect(previewReq.request.method).toBe('GET');
    previewReq.flush({
      booking_amount: '10000.00',
      commission_rate: '0.10',
      required_commission: '1000.00',
      free_booking_eligible: false,
      wallet_balance: '500.00',
      shortfall: '500.00',
      confirmation_allowed: false,
      currency: 'LKR',
    });
    const preview = await previewPromise;
    expect(preview.shortfall).toBe('500.00');
  });

  it('parses 401, 403, 409 insufficient balance, 422, and 500 errors accurately', () => {
    expect(parseWalletApiError({ status: 401 }).message).toContain('session has expired');
    expect(
      parseWalletApiError({ status: 403, error: { detail: 'An active approved provider account is required' } }).message
    ).toContain('approved provider');

    const conflict = parseWalletApiError({
      status: 409,
      error: {
        detail: {
          code: 'insufficient_wallet_balance',
          message: 'Top up your wallet before confirming this booking.',
          currency: 'LKR',
          current_balance: '0.00',
          required_commission: '500.00',
          shortfall: '500.00',
        },
      },
    });
    expect(conflict.insufficientBalance?.shortfall).toBe('500.00');

    expect(
      parseWalletApiError({ status: 422, error: { detail: [{ msg: 'Invalid UUID' }] } }).message
    ).toContain('Invalid UUID');
    expect(parseWalletApiError({ status: 500 }).isRetryable).toBe(true);
  });
});
