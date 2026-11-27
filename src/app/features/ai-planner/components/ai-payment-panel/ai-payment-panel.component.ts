import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { generateRequestUuid } from '../../../../core/utils/uuid.util';
import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import {
  AiBookingDetailResponse,
  AiPaymentResponse,
  formatBookingStatusMessage,
} from '../../models/ai-planner.models';
import { AiPlannerService, formatAiPlannerError } from '../../services/ai-planner.service';

@Component({
  selector: 'app-ai-payment-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, LkrCurrencyPipe],
  template: `
    <section class="payment-panel" aria-label="Booking Status and Payment">
      <header class="panel-head">
        <div>
          <span class="ref-tag">{{ booking.booking_reference || 'Booking #' + booking.id }}</span>
          <h3>{{ statusMessage }}</h3>
        </div>
        <strong class="amount">{{ booking.total_amount | lkrCurrency }}</strong>
      </header>

      <div class="meta-grid">
        <div>
          <span>Booking Status</span>
          <strong>{{ booking.status }}</strong>
        </div>
        <div>
          <span>Payment Status</span>
          <strong>{{ currentPaymentStatus() }}</strong>
        </div>
        <div>
          <span>Schedule</span>
          <strong>{{ booking.starts_at | date: 'mediumDate' }} &ndash; {{ booking.ends_at | date: 'mediumDate' }}</strong>
        </div>
      </div>

      @if (!isPaymentResolved()) {
        <div class="payment-selector">
          <div class="demo-notice">
            Online payment uses CeylonGo <strong>Academic Demo Simulation</strong> — no real card details or real money are processed.
          </div>

          <div class="pay-buttons">
            <button
              type="button"
              class="btn-primary"
              (click)="payOnlineDemo('success')"
              [disabled]="isPaying()"
            >
              {{ isPaying() && lastOperation() === 'simulate' ? 'Processing...' : 'Online Payment (Academic Demo)' }}
            </button>
            <button
              type="button"
              class="btn-secondary"
              (click)="selectAtLocation()"
              [disabled]="isPaying()"
            >
              {{ isPaying() && lastOperation() === 'at_location' ? 'Saving...' : 'Pay at Location' }}
            </button>
          </div>
        </div>
      }

      @if (errorMessage()) {
        <div class="pay-error" role="alert">
          <p>{{ errorMessage() }}</p>
          @if (!isPaymentResolved()) {
            <button type="button" class="btn-retry" (click)="retryFailedOperation()" [disabled]="isPaying()">
              {{ lastOperation() === 'at_location' ? 'Retry Pay at Location' : 'Retry Demo Payment' }}
            </button>
          }
        </div>
      }

      <footer class="panel-actions">
        <a routerLink="/my-bookings" class="btn-outline-link">View My Bookings</a>
        <button type="button" class="btn-ghost-link" (click)="continuePlanning.emit()">
          Continue Planning
        </button>
      </footer>
    </section>
  `,
  styles: [`
    .payment-panel {
      border: 1.5px solid #bfdbfe;
      border-radius: 14px;
      background: #f5f8fc;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      flex-wrap: wrap;

      h3 {
        margin: 0.2rem 0 0;
        color: #082b5c;
        font-size: 1rem;
        font-weight: 700;
      }
    }

    .ref-tag {
      display: inline-block;
      padding: 0.16rem 0.55rem;
      border-radius: 999px;
      background: #082b5c;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .amount {
      color: #0066ff;
      font-size: 1.05rem;
      font-weight: 700;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.65rem;
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #e2e8f0;

      span {
        display: block;
        color: #64748b;
        font-size: 0.73rem;
      }

      strong {
        color: #0f172a;
        font-size: 0.85rem;
        text-transform: capitalize;
      }
    }

    .payment-selector {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .demo-notice {
      padding: 0.6rem 0.75rem;
      border-radius: 9px;
      background: #eaf2ff;
      color: #082b5c;
      font-size: 0.8rem;
    }

    .pay-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    .btn-primary {
      border: none;
      border-radius: 9px;
      padding: 0.5rem 0.95rem;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;

      &:hover:not(:disabled) { background: #0052cc; }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }

    .btn-secondary,
    .btn-outline-link {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.48rem 0.9rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      font-size: 0.84rem;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-ghost-link {
      border: none;
      background: transparent;
      color: #0066ff;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;
    }

    .pay-error {
      padding: 0.6rem 0.75rem;
      border-radius: 9px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.83rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;

      p { margin: 0; }
    }

    .btn-retry {
      align-self: flex-start;
      border: 1px solid #fca5a5;
      border-radius: 7px;
      padding: 0.35rem 0.7rem;
      background: #ffffff;
      color: #b91c1c;
      font-weight: 600;
      cursor: pointer;
    }

    .panel-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
  `],
})
export class AiPaymentPanelComponent implements OnChanges {
  private readonly aiService = inject(AiPlannerService);

  @Input({ required: true }) booking!: AiBookingDetailResponse;
  @Output() paymentUpdated = new EventEmitter<AiPaymentResponse>();
  @Output() continuePlanning = new EventEmitter<void>();

  readonly isPaying = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly latestPayment = signal<AiPaymentResponse | null>(null);
  readonly attemptNo = signal(1);
  readonly lastOperation = signal<'simulate' | 'at_location'>('simulate');

  private trackedBookingId: number | null = null;
  private pendingSimulateKey: string | null = null;
  private pendingSimulateAttempt: number | null = null;
  private pendingSimulateOutcome: 'success' | 'failure' | null = null;
  private pendingAtLocationKey: string | null = null;

  get statusMessage(): string {
    return formatBookingStatusMessage(this.booking?.status);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const payments = this.booking?.payments ?? [];
    if (payments.length > 0) {
      this.latestPayment.set(payments[payments.length - 1]);
      const maxAttempt = payments.reduce((m, p) => Math.max(m, p.attempt_no || 1), 0);
      this.attemptNo.set(maxAttempt + 1);
    } else if (changes['booking'] && this.booking?.id !== this.trackedBookingId) {
      this.latestPayment.set(null);
      this.attemptNo.set(1);
    }

    if (this.booking?.id !== this.trackedBookingId) {
      this.trackedBookingId = this.booking?.id ?? null;
      this.pendingSimulateKey = null;
      this.pendingSimulateAttempt = null;
      this.pendingSimulateOutcome = null;
      this.pendingAtLocationKey = null;
      this.errorMessage.set(null);
    }
  }

  currentPaymentStatus(): string {
    const p = this.latestPayment();
    if (p) {
      if (p.method === 'at_location' && p.status === 'unpaid') {
        return 'Pay at Location (Unpaid)';
      }
      if (p.status === 'demo_succeeded') {
        return 'Academic Demo Payment Succeeded';
      }
      return p.status;
    }
    return 'Unpaid';
  }

  isPaymentResolved(): boolean {
    const p = this.latestPayment();
    return !!p && (p.status === 'demo_succeeded' || p.method === 'at_location');
  }

  payOnlineDemo(outcome: 'success' | 'failure' = 'success'): void {
    if (this.isPaying() || this.isPaymentResolved()) return;

    // Switching payment operation invalidates any prior at-location retry key.
    this.pendingAtLocationKey = null;
    this.lastOperation.set('simulate');
    this.isPaying.set(true);
    this.errorMessage.set(null);

    const canReuseRetry =
      this.pendingSimulateKey !== null &&
      this.pendingSimulateAttempt !== null &&
      this.pendingSimulateOutcome === outcome;

    const reqKey = canReuseRetry ? this.pendingSimulateKey! : generateRequestUuid();
    const attempt = canReuseRetry ? this.pendingSimulateAttempt! : this.attemptNo();

    this.pendingSimulateKey = reqKey;
    this.pendingSimulateAttempt = attempt;
    this.pendingSimulateOutcome = outcome;

    this.aiService.simulatePayment(this.booking.id, reqKey, attempt, outcome).subscribe({
      next: (payment) => {
        this.isPaying.set(false);
        this.pendingSimulateKey = null;
        this.pendingSimulateAttempt = null;
        this.pendingSimulateOutcome = null;
        this.latestPayment.set(payment);
        this.paymentUpdated.emit(payment);

        if (payment.status.toLowerCase().includes('fail')) {
          // Recorded failed payment requires a fresh attempt_no and new UUID on the next attempt.
          this.attemptNo.set(attempt + 1);
          this.errorMessage.set(
            'Academic Demo payment failed. You can safely retry payment or choose Pay at Location.',
          );
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isPaying.set(false);
        if (err?.status === 409) {
          this.pendingSimulateKey = null;
          this.pendingSimulateAttempt = null;
          this.pendingSimulateOutcome = null;
          this.syncAuthoritativeBookingAfterConflict(err);
          return;
        }
        if (err?.status >= 400 && err?.status < 500) {
          // Invalid client payload must use a fresh key once corrected; keep attemptNo intact.
          this.pendingSimulateKey = null;
          this.pendingSimulateAttempt = null;
          this.pendingSimulateOutcome = null;
        }
        // On status 0 or 5xx, keep pendingSimulateKey & pendingSimulateAttempt so identical retry reuses the same key.
        this.errorMessage.set(formatAiPlannerError(err, 'Payment simulation failed.').message);
      },
    });
  }

  selectAtLocation(): void {
    if (this.isPaying() || this.isPaymentResolved()) return;

    // Switching payment operation clears any pending online simulation retry key.
    this.pendingSimulateKey = null;
    this.pendingSimulateAttempt = null;
    this.pendingSimulateOutcome = null;
    this.lastOperation.set('at_location');
    this.isPaying.set(true);
    this.errorMessage.set(null);

    const reqKey = this.pendingAtLocationKey ?? generateRequestUuid();
    this.pendingAtLocationKey = reqKey;

    this.aiService.payAtLocation(this.booking.id, reqKey).subscribe({
      next: (payment) => {
        this.isPaying.set(false);
        this.pendingAtLocationKey = null;
        this.latestPayment.set(payment);
        this.paymentUpdated.emit(payment);
      },
      error: (err: HttpErrorResponse) => {
        this.isPaying.set(false);
        if (err?.status === 409) {
          this.pendingAtLocationKey = null;
          this.syncAuthoritativeBookingAfterConflict(err);
          return;
        }
        if (err?.status >= 400 && err?.status < 500) {
          this.pendingAtLocationKey = null;
        }
        // On status 0 or 5xx, keep pendingAtLocationKey so identical retry reuses the same key.
        this.errorMessage.set(formatAiPlannerError(err, 'Could not record Pay at Location selection.').message);
      },
    });
  }

  retryFailedOperation(): void {
    if (this.lastOperation() === 'at_location') {
      this.selectAtLocation();
    } else {
      this.payOnlineDemo('success');
    }
  }

  private syncAuthoritativeBookingAfterConflict(err: HttpErrorResponse): void {
    this.aiService.getBookingDetail(this.booking.id).subscribe({
      next: (detail) => {
        const payments = detail?.payments ?? [];
        if (payments.length > 0) {
          const latest = payments[payments.length - 1];
          this.latestPayment.set(latest);
          const maxAttempt = payments.reduce((m, p) => Math.max(m, p.attempt_no || 1), 0);
          this.attemptNo.set(maxAttempt + 1);
          if (latest.status === 'demo_succeeded' || latest.method === 'at_location') {
            this.paymentUpdated.emit(latest);
            this.errorMessage.set(null);
            return;
          }
        }
        this.errorMessage.set(formatAiPlannerError(err, 'Payment state updated. Please review before retrying.').message);
      },
      error: () => {
        this.errorMessage.set(formatAiPlannerError(err, 'Payment state conflict. Please refresh booking status.').message);
      },
    });
  }
}
