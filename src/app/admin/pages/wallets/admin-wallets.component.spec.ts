import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminWalletTotals,
  TransactionPage,
  WalletPage,
  WalletSummary,
} from '../../core/models/admin-wallet.models';
import { AdminWalletService } from '../../core/services/admin-wallet.service';
import { AdminWalletsComponent } from './admin-wallets.component';

describe('AdminWalletsComponent', () => {
  let component: AdminWalletsComponent;
  let fixture: ComponentFixture<AdminWalletsComponent>;

  const mockSummary: AdminWalletTotals = {
    currency: 'LKR',
    total_provider_wallets: 2,
    total_wallet_balances: '12500.00',
    total_top_ups: '15000.00',
    gross_commission_collected: '3000.00',
    commission_refunds: '500.00',
    net_commission_revenue: '2500.00',
    total_commission_free_bookings: 4,
  };

  const mockWalletPage: WalletPage = {
    page: 1,
    page_size: 15,
    total: 2,
    items: [
      {
        provider_id: 10,
        balance: '7500.00',
        currency: 'LKR',
        commission_rate: '0.10',
        free_bookings_used: 3,
        free_bookings_remaining: 0,
        total_top_ups: '10000.00',
        total_commission_deducted: '3000.00',
        total_commission_refunded: '500.00',
        net_commission_paid: '2500.00',
      },
      {
        provider_id: 11,
        balance: '5000.00',
        currency: 'LKR',
        commission_rate: '0.10',
        free_bookings_used: 1,
        free_bookings_remaining: 2,
        total_top_ups: '5000.00',
        total_commission_deducted: '0.00',
        total_commission_refunded: '0.00',
        net_commission_paid: '0.00',
      },
    ],
  };

  const mockDetail: WalletSummary = mockWalletPage.items[0];
  const mockTxPage: TransactionPage = {
    page: 1,
    page_size: 15,
    total: 1,
    items: [
      {
        id: 88,
        booking_id: 410,
        deduction_id: 85,
        transaction_type: 'commission_refund',
        amount: '500.00',
        balance_before: '7000.00',
        balance_after: '7500.00',
        commission_rate: '0.10',
        booking_amount: '5000.00',
        request_key: null,
        simulate_outcome: null,
        description: 'Booking commission refunded',
        created_at: '2026-11-27T09:15:00Z',
      },
    ],
  };

  let adminWalletServiceMock: {
    canViewWallets: () => boolean;
    getWalletSummary: ReturnType<typeof vi.fn>;
    getWallets: ReturnType<typeof vi.fn>;
    getProviderWallet: ReturnType<typeof vi.fn>;
    getProviderTransactions: ReturnType<typeof vi.fn>;
    getProviderDirectoryLookup: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    adminWalletServiceMock = {
      canViewWallets: () => true,
      getWalletSummary: vi.fn().mockReturnValue(of(mockSummary)),
      getWallets: vi.fn().mockReturnValue(of(mockWalletPage)),
      getProviderWallet: vi.fn().mockReturnValue(of(mockDetail)),
      getProviderTransactions: vi.fn().mockReturnValue(of(mockTxPage)),
      getProviderDirectoryLookup: vi.fn().mockReturnValue(
        of([
          {
            id: 10,
            user_id: 50,
            business_name: 'Kandy Hills Homestay',
            phone: '0771234567',
            district: 'Kandy',
            verification_status: 'approved',
          },
        ])
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AdminWalletsComponent],
      providers: [{ provide: AdminWalletService, useValue: adminWalletServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminWalletsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders platform wallet totals and provider directory without balance editing or withdrawal controls', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('LKR 12,500.00');
    expect(el.textContent).toContain('LKR 15,000.00');
    expect(el.textContent).toContain('LKR 3,000.00');
    expect(el.textContent).toContain('LKR 500.00');
    expect(el.textContent).toContain('LKR 2,500.00');
    expect(el.textContent).toContain('Kandy Hills Homestay');
    expect(el.textContent).not.toContain('Withdraw');
    expect(el.textContent).not.toContain('Adjust Balance');
  });

  it('loads individual provider wallet details and filters transactions on selection', () => {
    component.selectProvider(10);
    fixture.detectChanges();

    expect(adminWalletServiceMock.getProviderWallet).toHaveBeenCalledWith(10);
    expect(adminWalletServiceMock.getProviderTransactions).toHaveBeenCalledWith(10, {
      page: 1,
      page_size: 15,
      transaction_type: '',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('TX-88');

    component.onTransactionTypeChange('commission_refund');
    expect(adminWalletServiceMock.getProviderTransactions).toHaveBeenCalledWith(10, {
      page: 1,
      page_size: 15,
      transaction_type: 'commission_refund',
    });
  });

  it('handles HTTP 403 error when loading summary', () => {
    adminWalletServiceMock.getWalletSummary.mockReturnValueOnce(
      throwError(() => ({ status: 403, error: { detail: 'Admin access required' } }))
    );
    component.loadSummary();
    fixture.detectChanges();

    expect(component.summaryError()).toContain('Admin access required');
  });
});
