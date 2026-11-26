import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import {
  AiBookingDetailResponse,
  AiPaymentResponse,
  formatBookingStatusMessage,
} from '../../models/ai-planner.models';
import {
  AiPlannerService,
  formatAiPlannerError,
  makeIdempotencyKey,
} from '../../services/ai-planner.service';

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
              {{ isPaying() ? 'Processing...' : 'Online Payment (Academic Demo)' }}
            </button>
            <button
              type="button"
              class="btn-secondary"
              (click)="selectAtLocation()"
              [disabled]="isPaying()"
            >
              Pay at Location
            </button>
          </div>
        </div>
      }

      @if (errorMessage()) {
        <div class="pay-error" role="alert">
          <p>{{ errorMessage() }}</p>
          @if (latestPayment()?.status === 'failed' || !isPaymentResolved()) {
            <button type="button" class="btn-retry" (click)="payOnlineDemo('success')" [disabled]="isPaying()">
              Retry Demo Payment
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

      h3 {
        margin: 0.2rem 0 0;
        color: #082b5c;
        font-size: 0.98rem;
        font-weight: 700;
      }
    }

    .ref-tag {
      display: inline-block;
      padding: 0.16rem 0.55rem;
      border-radius: 999px;
      background: #082b5c;
      color: #ffffff;
      font-size: 0.73rem;
      font-weight: 700;
    }

    .amount {
      color: #0066ff;
      font-size: 1rem;
      white-space: nowrap;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.55rem;
      padding: 0.65rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;

      span {
        display: block;
        color: #64748b;
        font-size: 0.73rem;
      }

      strong {
        color: #0f172a;
        font-size: 0.85rem;
      }
    }

    .payment-selector {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    .demo-notice {
      padding: 0.55rem 0.75rem;
      border-radius: 9px;
      background: #eaf2ff;
      color: #082b5c;
      font-size: 0.8rem;
    }

    .pay-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
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

  get statusMessage(): string {
    return formatBookingStatusMessage(this.booking?.status);
  }

  ngOnChanges(): void {
    const payments = this.booking?.payments ?? [];
    if (payments.length > 0) {
      this.latestPayment.set(payments[payments.length - 1]);
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
    if (this.isPaying()) return;
    this.isPaying.set(true);
    this.errorMessage.set(null);

    const attempt = this.attemptNo();
    this.attemptNo.set(attempt + 1);
    const reqKey = makeIdempotencyKey('pay');

    this.aiService.simulatePayment(this.booking.id, reqKey, attempt, outcome).subscribe({
      next: (payment) => {
        this.isPaying.set(false);
        this.latestPayment.set(payment);
        this.paymentUpdated.emit(payment);
        if (payment.status.toLowerCase().includes('fail')) {
          this.errorMessage.set(
            'Academic Demo payment failed. You can safely retry payment or choose Pay at Location.',
          );
        }
      },
      error: (err) => {
        this.isPaying.set(false);
        this.errorMessage.set(formatAiPlannerError(err, 'Payment simulation failed.').message);
      },
    });
  }

  selectAtLocation(): void {
    if (this.isPaying()) return;
    this.isPaying.set(true);
    this.errorMessage.set(null);

    const reqKey = makeIdempotencyKey('loc');
    this.aiService.payAtLocation(this.booking.id, reqKey).subscribe({
      next: (payment) => {
        this.isPaying.set(false);
        this.latestPayment.set(payment);
        this.paymentUpdated.emit(payment);
      },
      error: (err) => {
        this.isPaying.set(false);
        this.errorMessage.set(formatAiPlannerError(err, 'Could not record Pay at Location selection.').message);
      },
    });
  }
}
