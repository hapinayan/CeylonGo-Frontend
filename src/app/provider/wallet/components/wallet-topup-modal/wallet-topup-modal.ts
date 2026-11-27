import { CommonModule } from '@angular/common';
import {
  Component,
  OnChanges,
  SimpleChanges,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  SimulateOutcome,
  TopUpResult,
  formatLkr,
  parseWalletApiError,
  toAmountNumber,
} from '../../../../core/models/wallet.models';
import { WalletService } from '../../../../core/services/wallet.service';

@Component({
  selector: 'app-wallet-topup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet-topup-modal.html',
  styleUrl: './wallet-topup-modal.scss',
})
export class WalletTopupModalComponent implements OnChanges {
  private readonly walletService = inject(WalletService);

  readonly isOpen = input<boolean>(false);
  readonly currentBalance = input<string | number | null>(null);
  readonly suggestedAmount = input<string | number | null>(null);

  readonly closed = output<void>();
  readonly topUpRecorded = output<TopUpResult>();
  readonly topUpSucceeded = output<TopUpResult>();

  readonly quickAmounts = [1000, 2500, 5000, 10000] as const;

  amountInput = '1000.00';
  simulateOutcome: SimulateOutcome = 'success';

  readonly requestKey = signal<string>(this.walletService.generateRequestKey());
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canRetrySameKey = signal<boolean>(false);
  readonly resultBanner = signal<TopUpResult | null>(null);
  readonly keyConsumed = signal<boolean>(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetForNewSession();
    } else if (changes['suggestedAmount'] && this.isOpen() && !this.isSubmitting()) {
      const suggested = toAmountNumber(this.suggestedAmount());
      if (suggested > 0) {
        this.amountInput = suggested.toFixed(2);
      }
    }
  }

  private resetForNewSession(): void {
    const suggested = toAmountNumber(this.suggestedAmount());
    this.amountInput = suggested > 0 ? suggested.toFixed(2) : '1000.00';
    this.simulateOutcome = 'success';
    this.requestKey.set(this.walletService.generateRequestKey());
    this.isSubmitting.set(false);
    this.errorMessage.set(null);
    this.canRetrySameKey.set(false);
    this.resultBanner.set(null);
    this.keyConsumed.set(false);
  }

  suggestedAmountValue(): number {
    return toAmountNumber(this.suggestedAmount());
  }

  formattedCurrentBalance(): string {
    return formatLkr(this.currentBalance());
  }

  formattedSuggestedAmount(): string {
    return formatLkr(this.suggestedAmount());
  }

  selectQuickAmount(amount: number): void {
    if (this.isSubmitting()) return;
    this.rotateKeyIfConsumed();
    this.amountInput = amount.toFixed(2);
    this.errorMessage.set(null);
    this.resultBanner.set(null);
  }

  onAmountInputChange(value: string): void {
    this.rotateKeyIfConsumed();
    this.amountInput = value;
    this.errorMessage.set(null);
    this.resultBanner.set(null);
  }

  onOutcomeChange(outcome: SimulateOutcome): void {
    if (this.isSubmitting()) return;
    this.rotateKeyIfConsumed();
    this.simulateOutcome = outcome;
    this.errorMessage.set(null);
    this.resultBanner.set(null);
  }

  private rotateKeyIfConsumed(): void {
    if (this.keyConsumed()) {
      this.requestKey.set(this.walletService.generateRequestKey());
      this.keyConsumed.set(false);
      this.canRetrySameKey.set(false);
    }
  }

  validationError(): string | null {
    const trimmed = String(this.amountInput ?? '').trim();
    if (!trimmed) {
      return 'Enter a top-up amount in LKR.';
    }
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      return 'Enter a valid positive amount with up to 2 decimal places (e.g. 2500.00).';
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0.01 || parsed > 1000000) {
      return 'Amount must be between LKR 0.01 and LKR 1,000,000.00.';
    }
    return null;
  }

  isQuickAmountSelected(amount: number): boolean {
    return Math.abs(toAmountNumber(this.amountInput) - amount) < 0.001;
  }

  generateNewAttemptKey(): void {
    if (this.isSubmitting()) return;
    this.requestKey.set(this.walletService.generateRequestKey());
    this.keyConsumed.set(false);
    this.canRetrySameKey.set(false);
    this.errorMessage.set(null);
    this.resultBanner.set(null);
  }

  submitTopUp(): void {
    if (this.isSubmitting()) {
      return;
    }

    const validation = this.validationError();
    if (validation) {
      this.errorMessage.set(validation);
      return;
    }

    const normalizedAmount = Number(String(this.amountInput).trim()).toFixed(2);
    const key = this.requestKey();
    const outcome = this.simulateOutcome;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.resultBanner.set(null);

    this.walletService
      .topUpWallet({
        amount: normalizedAmount,
        request_key: key,
        simulate_outcome: outcome,
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.canRetrySameKey.set(false);
          this.keyConsumed.set(true);
          this.resultBanner.set(res);
          this.topUpRecorded.emit(res);
          if (res.success) {
            this.topUpSucceeded.emit(res);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const parsed = parseWalletApiError(err, 'Failed to process simulated wallet top-up.');
          this.errorMessage.set(parsed.message);
          if (parsed.isRetryable) {
            // Preserve the exact same request_key for uncertain retries (network/timeout/5xx)
            this.canRetrySameKey.set(true);
            this.keyConsumed.set(false);
          } else {
            this.canRetrySameKey.set(false);
            this.keyConsumed.set(parsed.isConflict);
          }
        },
      });
  }

  close(): void {
    if (this.isSubmitting()) return;
    this.closed.emit();
  }
}
