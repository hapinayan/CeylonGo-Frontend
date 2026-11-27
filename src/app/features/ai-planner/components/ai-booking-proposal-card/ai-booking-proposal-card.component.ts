import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import {
  AiBookingDetailResponse,
  AiBookingProposal,
  getServiceCategoryLabel,
} from '../../models/ai-planner.models';
import { AiPlannerService, formatAiPlannerError } from '../../services/ai-planner.service';

@Component({
  selector: 'app-ai-booking-proposal-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, LkrCurrencyPipe],
  template: `
    @if (!cancelled()) {
      <section class="proposal-card" aria-label="Verified Booking Proposal">
        <header class="proposal-head">
          <div>
            <span class="verified-quote-badge">Verified Server Quote</span>
            <h3>{{ proposal.quote.title }}</h3>
            <span class="cat-sub">{{ categoryLabel }}</span>
          </div>
          @if (photoUrl(); as src) {
            <img class="proposal-thumb" [src]="src" [alt]="proposal.quote.title" />
          }
        </header>

        <dl class="proposal-specs">
          <div>
            <dt>Dates / Schedule</dt>
            <dd>{{ proposal.quote.starts_at | date: 'medium' }} &ndash; {{ proposal.quote.ends_at | date: 'medium' }}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{{ proposal.quote.quantity }}</dd>
          </div>
          @if (proposal.quote.room_id) {
            <div>
              <dt>Room Selection</dt>
              <dd>Room #{{ proposal.quote.room_id }}</dd>
            </div>
          }
          @if (proposal.quote.slot_id) {
            <div>
              <dt>Session Slot</dt>
              <dd>Slot #{{ proposal.quote.slot_id }}</dd>
            </div>
          }
          @if (proposal.quote.package_id) {
            <div>
              <dt>Package</dt>
              <dd>Package #{{ proposal.quote.package_id }}</dd>
            </div>
          }
          <div>
            <dt>Verified Total</dt>
            <dd class="total-price">{{ proposal.quote.total_lkr | lkrCurrency }}</dd>
          </div>
          <div>
            <dt>Quote Valid Until</dt>
            <dd [class.expired-text]="isLocallyExpired()">
              {{ proposal.expires_at | date: 'medium' }}
              @if (isLocallyExpired()) { (Expired — request a new quote) }
            </dd>
          </div>
        </dl>

        @if (proposal.quote.motorcycle_license_required && !confirmedBooking()) {
          <div class="license-box">
            <label class="checkbox-row">
              <input
                type="checkbox"
                [(ngModel)]="licenseConfirmed"
                [disabled]="isConfirming()"
              />
              <span>I hold a valid Sri Lankan / International motorcycle driving license for this vehicle. *</span>
            </label>
            <label class="date-row">
              <span>License Valid Until *</span>
              <input
                type="date"
                [(ngModel)]="licenseValidUntil"
                [disabled]="isConfirming()"
              />
            </label>
          </div>
        }

        @if (errorMessage()) {
          <div class="proposal-error" role="alert">
            <p>{{ errorMessage() }}</p>
            @if (needsFreshQuote()) {
              <button type="button" class="btn-secondary-sm" (click)="modifyRequested.emit()">
                Request Updated Quote
              </button>
            }
          </div>
        }

        @if (!confirmedBooking()) {
          <div class="proposal-actions">
            <button
              type="button"
              class="btn-confirm"
              (click)="confirm()"
              [disabled]="isConfirming() || isLocallyExpired()"
            >
              {{ isConfirming() ? 'Confirming Booking...' : 'Confirm Booking' }}
            </button>
            <button
              type="button"
              class="btn-secondary"
              (click)="modifyRequested.emit()"
              [disabled]="isConfirming()"
            >
              Modify Details
            </button>
            <button
              type="button"
              class="btn-ghost"
              (click)="cancelProposal()"
              [disabled]="isConfirming()"
            >
              Cancel Proposal
            </button>
          </div>
        }
      </section>
    }
  `,
  styles: [`
    .proposal-card {
      border: 1.5px solid #bfdbfe;
      border-radius: 14px;
      background: #ffffff;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .proposal-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;

      h3 {
        margin: 0.2rem 0 0.1rem;
        color: #082b5c;
        font-size: 1.02rem;
        font-weight: 700;
      }
    }

    .verified-quote-badge {
      display: inline-block;
      padding: 0.16rem 0.55rem;
      border-radius: 999px;
      background: #eaf2ff;
      color: #0066ff;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .cat-sub {
      color: #64748b;
      font-size: 0.8rem;
    }

    .proposal-thumb {
      width: 68px;
      height: 52px;
      border-radius: 9px;
      object-fit: cover;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }

    .proposal-specs {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
      gap: 0.6rem;
      padding: 0.7rem;
      border-radius: 10px;
      background: #f5f8fc;

      dt {
        font-size: 0.73rem;
        color: #64748b;
        margin-bottom: 0.1rem;
      }

      dd {
        margin: 0;
        font-size: 0.85rem;
        color: #0f172a;
        font-weight: 600;
      }

      .total-price {
        color: #0066ff;
        font-size: 0.96rem;
        font-weight: 700;
      }

      .expired-text {
        color: #dc2626;
      }
    }

    .license-box {
      padding: 0.75rem;
      border-radius: 10px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      font-size: 0.83rem;
      color: #0f172a;
    }

    .checkbox-row {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      cursor: pointer;
    }

    .date-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;

      input {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0.35rem 0.55rem;
        font: inherit;
      }
    }

    .proposal-error {
      padding: 0.65rem 0.8rem;
      border-radius: 10px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.84rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;

      p { margin: 0; }
    }

    .proposal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .btn-confirm {
      border: none;
      border-radius: 9px;
      padding: 0.52rem 1.05rem;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.86rem;
      cursor: pointer;

      &:hover:not(:disabled) { background: #0052cc; }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }

    .btn-secondary,
    .btn-secondary-sm {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.5rem 0.9rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;
      align-self: flex-start;
    }

    .btn-ghost {
      border: none;
      background: transparent;
      color: #64748b;
      font-weight: 600;
      font-size: 0.84rem;
      padding: 0.5rem 0.7rem;
      cursor: pointer;

      &:hover { color: #dc2626; }
    }
  `],
})
export class AiBookingProposalCardComponent implements OnInit {
  private readonly aiService = inject(AiPlannerService);

  @Input({ required: true }) proposal!: AiBookingProposal;
  @Output() bookingCreated = new EventEmitter<AiBookingDetailResponse>();
  @Output() modifyRequested = new EventEmitter<void>();
  @Output() proposalCancelled = new EventEmitter<void>();

  readonly photoUrl = signal<string | null>(null);
  readonly isConfirming = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly needsFreshQuote = signal(false);
  readonly confirmedBooking = signal<AiBookingDetailResponse | null>(null);
  readonly cancelled = signal(false);

  licenseConfirmed = false;
  licenseValidUntil = '';

  get categoryLabel(): string {
    return getServiceCategoryLabel(this.proposal.quote.category);
  }

  ngOnInit(): void {
    this.aiService
      .resolveListingPhoto(this.proposal.quote.category, this.proposal.quote.listing_id)
      .subscribe((url) => this.photoUrl.set(url));
  }

  isLocallyExpired(): boolean {
    const exp = Date.parse(this.proposal?.expires_at || '');
    return Number.isFinite(exp) && Date.now() > exp;
  }

  confirm(): void {
    if (this.isConfirming() || this.confirmedBooking() || this.cancelled()) return;

    if (this.isLocallyExpired()) {
      this.needsFreshQuote.set(true);
      this.errorMessage.set('This booking quote has expired. Request a fresh quote before confirming.');
      return;
    }

    if (this.proposal.quote.motorcycle_license_required) {
      if (!this.licenseConfirmed || !this.licenseValidUntil.trim()) {
        this.errorMessage.set(
          'Please confirm motorcycle driving license eligibility and enter your license expiry date.',
        );
        return;
      }
    }

    this.errorMessage.set(null);
    this.needsFreshQuote.set(false);
    this.isConfirming.set(true);

    this.aiService
      .confirmBooking({
        confirmation_token: this.proposal.confirmation_token,
        confirm: true,
        ...(this.proposal.quote.motorcycle_license_required
          ? {
              motorcycle_license_confirmed: true,
              license_valid_until: this.licenseValidUntil.trim(),
            }
          : {}),
      })
      .subscribe({
        next: (booking) => {
          this.isConfirming.set(false);
          this.confirmedBooking.set(booking);
          this.bookingCreated.emit(booking);
        },
        error: (err) => {
          this.isConfirming.set(false);
          const formatted = formatAiPlannerError(err, 'Could not confirm booking.');
          if (formatted.code === 'expired_or_conflict') {
            this.needsFreshQuote.set(true);
          }
          this.errorMessage.set(formatted.message);
        },
      });
  }

  cancelProposal(): void {
    if (this.isConfirming()) return;
    this.cancelled.set(true);
    this.proposalCancelled.emit();
  }
}
