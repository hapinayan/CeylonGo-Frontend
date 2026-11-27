import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TopUpResult } from '../../../../core/models/wallet.models';
import { WalletService } from '../../../../core/services/wallet.service';
import { WalletTopupModalComponent } from './wallet-topup-modal';

describe('WalletTopupModalComponent', () => {
  let component: WalletTopupModalComponent;
  let fixture: ComponentFixture<WalletTopupModalComponent>;
  let walletServiceMock: {
    generateRequestKey: ReturnType<typeof vi.fn>;
    topUpWallet: ReturnType<typeof vi.fn>;
  };
  let keyCounter = 0;

  beforeEach(async () => {
    keyCounter = 0;
    walletServiceMock = {
      generateRequestKey: vi.fn(() => {
        keyCounter += 1;
        return `11111111-1111-4111-8111-00000000000${keyCounter}`;
      }),
      topUpWallet: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [WalletTopupModalComponent],
      providers: [{ provide: WalletService, useValue: walletServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(WalletTopupModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('currentBalance', '500.00');
    fixture.detectChanges();
  });

  it('displays Academic Demo label and supports quick amount selections', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Academic Demo — Simulated Payment');

    component.selectQuickAmount(5000);
    expect(component.amountInput).toBe('5000.00');
  });

  it('validates custom amount bounds and decimal precision', () => {
    component.onAmountInputChange('1.001');
    component.submitTopUp();
    expect(component.errorMessage()).toContain('2 decimal places');
    expect(walletServiceMock.topUpWallet).not.toHaveBeenCalled();

    component.onAmountInputChange('1000001');
    component.submitTopUp();
    expect(component.errorMessage()).toContain('LKR 0.01');
    expect(walletServiceMock.topUpWallet).not.toHaveBeenCalled();
  });

  it('preserves request_key across uncertain network retries and prevents duplicate submissions', () => {
    const initialKey = component.requestKey();
    const pending$ = new Subject<TopUpResult>();
    walletServiceMock.topUpWallet.mockReturnValueOnce(pending$);

    component.selectQuickAmount(2500);
    component.submitTopUp();
    // Duplicate submission while in-flight must be ignored
    component.submitTopUp();
    expect(walletServiceMock.topUpWallet).toHaveBeenCalledTimes(1);

    pending$.error({ status: 0 });
    expect(component.isSubmitting()).toBe(false);
    expect(component.canRetrySameKey()).toBe(true);
    expect(component.requestKey()).toBe(initialKey);

    const successResult: TopUpResult = {
      success: true,
      currency: 'LKR',
      balance: '3000.00',
      message: 'Simulated top-up succeeded',
      transaction: {
        id: 12,
        booking_id: null,
        deduction_id: null,
        transaction_type: 'top_up',
        amount: '2500.00',
        balance_before: '500.00',
        balance_after: '3000.00',
        commission_rate: null,
        booking_amount: null,
        request_key: initialKey,
        simulate_outcome: 'success',
        description: 'Simulated top-up succeeded',
        created_at: '2026-11-27T08:00:00Z',
      },
    };
    walletServiceMock.topUpWallet.mockReturnValueOnce(of(successResult));
    const succeededSpy = vi.spyOn(component.topUpSucceeded, 'emit');

    component.submitTopUp();
    expect(walletServiceMock.topUpWallet).toHaveBeenNthCalledWith(2, {
      amount: '2500.00',
      request_key: initialKey,
      simulate_outcome: 'success',
    });
    expect(succeededSpy).toHaveBeenCalledWith(successResult);
  });

  it('supports simulated failed payment without emitting topUpSucceeded', () => {
    const failedResult: TopUpResult = {
      success: false,
      currency: 'LKR',
      balance: '500.00',
      message: 'Simulated top-up failed',
      transaction: {
        id: 13,
        booking_id: null,
        deduction_id: null,
        transaction_type: 'top_up',
        amount: '1000.00',
        balance_before: '500.00',
        balance_after: '500.00',
        commission_rate: null,
        booking_amount: null,
        request_key: component.requestKey(),
        simulate_outcome: 'failure',
        description: 'Simulated top-up failed',
        created_at: '2026-11-27T08:01:00Z',
      },
    };
    walletServiceMock.topUpWallet.mockReturnValueOnce(of(failedResult));
    const succeededSpy = vi.spyOn(component.topUpSucceeded, 'emit');
    const recordedSpy = vi.spyOn(component.topUpRecorded, 'emit');

    component.onOutcomeChange('failure');
    component.submitTopUp();
    fixture.detectChanges();

    expect(recordedSpy).toHaveBeenCalledWith(failedResult);
    expect(succeededSpy).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Simulated Payment Failed');
  });

  it('handles 409 request key conflict cleanly', () => {
    walletServiceMock.topUpWallet.mockReturnValueOnce(
      throwError(() => ({
        status: 409,
        error: { detail: 'Request key is already used for a different top-up' },
      }))
    );

    component.submitTopUp();
    expect(component.errorMessage()).toContain('Request key is already used');
    expect(component.canRetrySameKey()).toBe(false);
  });
});
