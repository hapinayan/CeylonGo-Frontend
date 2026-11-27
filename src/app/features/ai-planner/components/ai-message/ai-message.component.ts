import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import {
  AiBookingDetailResponse,
  AiBookingProposal,
  AiBookingStatus,
  AiListingResult,
  AiPaymentResponse,
  AiQuote,
  AiTurn,
  formatBookingStatusMessage,
  parseSafeAiTextBlocks,
} from '../../models/ai-planner.models';
import { AiPlannerService, formatAiPlannerError } from '../../services/ai-planner.service';
import { AiBookingProposalCardComponent } from '../ai-booking-proposal-card/ai-booking-proposal-card.component';
import { AiItineraryCardComponent } from '../ai-itinerary-card/ai-itinerary-card.component';
import { AiPaymentPanelComponent } from '../ai-payment-panel/ai-payment-panel.component';
import { AiServiceCardComponent } from '../ai-service-card/ai-service-card.component';

@Component({
  selector: 'app-ai-message',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LkrCurrencyPipe,
    AiItineraryCardComponent,
    AiServiceCardComponent,
    AiBookingProposalCardComponent,
    AiPaymentPanelComponent,
  ],
  template: `
    <div class="turn-stack">
      <!-- TRAVELER MESSAGE (RIGHT-ALIGNED) -->
      @if (turn.user_message) {
        <div class="msg-row user-row">
          <div class="user-bubble">{{ turn.user_message }}</div>
        </div>
      }

      <!-- CEYLONGO AI RESPONSE (LEFT-ALIGNED) -->
      <div class="msg-row ai-row">
        <div class="ai-avatar" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
          </svg>
        </div>

        <div class="ai-content">
          @if (assistantBlocks().length > 0) {
            <div class="ai-text-card">
              @for (block of assistantBlocks(); track $index) {
                @switch (block.type) {
                  @case ('heading') {
                    <h4>{{ block.text }}</h4>
                  }
                  @case ('list') {
                    <ul>
                      @for (item of block.items || []; track $index) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                  }
                  @case ('table') {
                    <div class="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            @for (h of block.headers || []; track $index) {
                              <th>{{ h }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of block.rows || []; track $index) {
                            <tr>
                              @for (cell of row; track $index) {
                                <td>{{ cell }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                  @default {
                    <p>{{ block.text }}</p>
                  }
                }
              }
            </div>
          }

          @if (turn.itinerary; as itin) {
            <app-ai-itinerary-card
              [itinerary]="itin"
              [isSaving]="savingTurnId === turn.id"
              (saveTrip)="saveTripRequested.emit(turn)"
              (modifyTrip)="modifyTripRequested.emit(turn)"
              (askAi)="askAiRequested.emit(turn)"
              (viewServices)="servicesExpanded.set(true)"
              (askCheaper)="cheaperAlternativesRequested.emit(turn)"
              (listingSelected)="bookWithAiRequested.emit($event)"
            />
          }

          @if (combinedListings().length > 0) {
            <section class="services-section" aria-label="Recommended CeylonGo Services">
              <div class="services-head">
                <h4>Verified CeylonGo Recommendations ({{ combinedListings().length }})</h4>
                @if (combinedListings().length > 3) {
                  <button type="button" class="toggle-all-btn" (click)="servicesExpanded.update((v) => !v)">
                    {{ servicesExpanded() ? 'Show Fewer' : 'Show All' }}
                  </button>
                }
              </div>

              <div class="services-grid">
                @for (item of visibleListings(); track item.listing_id + '-' + item.ref) {
                  <app-ai-service-card
                    [listing]="item"
                    [verifiedQuote]="quoteForListing(item.listing_id)"
                    [busy]="bookingBusy"
                    (bookWithAi)="bookWithAiRequested.emit($event)"
                  />
                }
              </div>
            </section>
          }

          @if (activeProposal(); as prop) {
            <app-ai-booking-proposal-card
              [proposal]="prop"
              (bookingCreated)="onBookingConfirmed($event)"
              (modifyRequested)="modifyBookingRequested.emit(prop)"
              (proposalCancelled)="proposalDismissed.set(true)"
            />
          }

          @if (confirmedBookingDetail(); as detail) {
            <app-ai-payment-panel
              [booking]="detail"
              (paymentUpdated)="onPaymentUpdated($event)"
              (continuePlanning)="askAiRequested.emit(turn)"
            />
          } @else if (turn.bookings.length > 0) {
            @for (b of turn.bookings; track b.booking_id) {
              <div class="persisted-booking-card">
                <div>
                  <span class="booking-ref">Booking #{{ b.booking_id }}</span>
                  <p>{{ bookingStatusText(b.status) }}</p>
                  <small>
                    Total: {{ b.total_lkr | lkrCurrency }}
                    @if (b.payment_status) { · Payment: {{ b.payment_status }} }
                  </small>
                  @if (bookingLoadError()) {
                    <small class="load-err">{{ bookingLoadError() }}</small>
                  }
                </div>
                <div class="persisted-actions">
                  @if (isBookingPayable(b)) {
                    <button
                      type="button"
                      class="complete-payment-btn"
                      (click)="loadExistingBookingForPayment(b)"
                      [disabled]="loadingBookingId() === b.booking_id"
                    >
                      {{ loadingBookingId() === b.booking_id ? 'Loading...' : 'Complete Payment' }}
                    </button>
                  }
                  <a routerLink="/my-bookings" class="my-bookings-link">View My Bookings</a>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .turn-stack {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .msg-row {
      display: flex;
      width: 100%;
    }

    .user-row {
      justify-content: flex-end;
    }

    .user-bubble {
      max-width: min(76%, 640px);
      padding: 0.72rem 1rem;
      border-radius: 16px 16px 4px 16px;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.94rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .ai-row {
      align-items: flex-start;
      gap: 0.7rem;
    }

    .ai-avatar {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: #eaf2ff;
      border: 1px solid #bfdbfe;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .ai-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .ai-text-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px 14px 14px 14px;
      padding: 0.85rem 1.05rem;
      color: #0f172a;
      font-size: 0.94rem;
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      h4 {
        margin: 0.2rem 0 0;
        color: #082b5c;
        font-size: 0.98rem;
        font-weight: 700;
      }

      p {
        margin: 0;
        white-space: pre-wrap;
      }

      ul {
        margin: 0;
        padding-left: 1.2rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
    }

    .table-wrap {
      overflow-x: auto;

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }

      th,
      td {
        border: 1px solid #e2e8f0;
        padding: 0.42rem 0.6rem;
        text-align: left;
      }

      th {
        background: #f5f8fc;
        color: #082b5c;
        font-weight: 600;
      }
    }

    .services-section {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .services-head {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h4 {
        margin: 0;
        color: #082b5c;
        font-size: 0.92rem;
        font-weight: 700;
      }
    }

    .toggle-all-btn {
      border: none;
      background: transparent;
      color: #0066ff;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 0.75rem;
    }

    .persisted-booking-card {
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      background: #f5f8fc;
      padding: 0.85rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;

      p {
        margin: 0.2rem 0;
        color: #082b5c;
        font-weight: 600;
        font-size: 0.88rem;
      }

      small {
        color: #64748b;
        font-size: 0.8rem;
      }
    }

    .booking-ref {
      display: inline-block;
      padding: 0.14rem 0.5rem;
      border-radius: 999px;
      background: #082b5c;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
    }

    .my-bookings-link {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.42rem 0.8rem;
      background: #ffffff;
      color: #0066ff;
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none;
    }

    .persisted-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .complete-payment-btn {
      border: none;
      border-radius: 8px;
      padding: 0.44rem 0.85rem;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) { background: #0052cc; }
      &:disabled { opacity: 0.6; cursor: wait; }
    }

    .load-err {
      display: block;
      color: #b91c1c;
      margin-top: 0.25rem;
    }

    @media (max-width: 640px) {
      .user-bubble {
        max-width: 90%;
      }
    }
  `],
})
export class AiMessageComponent {
  private readonly aiService = inject(AiPlannerService, { optional: true });

  @Input({ required: true }) turn!: AiTurn;
  @Input() extraProposal: AiBookingProposal | null = null;
  @Input() savingTurnId: number | null = null;
  @Input() bookingBusy = false;

  @Output() saveTripRequested = new EventEmitter<AiTurn>();
  @Output() modifyTripRequested = new EventEmitter<AiTurn>();
  @Output() askAiRequested = new EventEmitter<AiTurn>();
  @Output() cheaperAlternativesRequested = new EventEmitter<AiTurn>();
  @Output() bookWithAiRequested = new EventEmitter<AiListingResult>();
  @Output() modifyBookingRequested = new EventEmitter<AiBookingProposal>();
  @Output() bookingConfirmed = new EventEmitter<AiBookingDetailResponse>();

  readonly servicesExpanded = signal(false);
  readonly proposalDismissed = signal(false);
  readonly confirmedBookingDetail = signal<AiBookingDetailResponse | null>(null);
  readonly loadingBookingId = signal<number | null>(null);
  readonly bookingLoadError = signal<string | null>(null);

  readonly assistantBlocks = computed(() => parseSafeAiTextBlocks(this.turn?.assistant_message || ''));

  readonly combinedListings = computed(() => {
    const map = new Map<number, AiListingResult>();
    for (const item of this.turn?.listings ?? []) {
      map.set(item.listing_id, item);
    }
    for (const item of this.turn?.itinerary?.listings ?? []) {
      if (!map.has(item.listing_id)) {
        map.set(item.listing_id, item);
      }
    }
    return Array.from(map.values());
  });

  readonly visibleListings = computed(() => {
    const all = this.combinedListings();
    return this.servicesExpanded() ? all : all.slice(0, 4);
  });

  activeProposal(): AiBookingProposal | null {
    if (this.proposalDismissed() || this.confirmedBookingDetail()) return null;
    return this.extraProposal || this.turn?.proposal || null;
  }

  quoteForListing(listingId: number): AiQuote | null {
    const allQuotes = [...(this.turn?.quotes ?? []), ...(this.turn?.itinerary?.quotes ?? [])];
    return allQuotes.find((q) => q.quote.listing_id === listingId)?.quote ?? null;
  }

  bookingStatusText(status: string): string {
    return formatBookingStatusMessage(status);
  }

  isBookingPayable(b: AiBookingStatus): boolean {
    const status = (b.status || '').toLowerCase();
    const payStatus = (b.payment_status || '').toLowerCase();
    const method = (b.payment_method || '').toLowerCase();
    if (['cancelled', 'rejected', 'completed', 'expired'].includes(status)) return false;
    if (payStatus === 'demo_succeeded' || payStatus === 'paid' || method === 'at_location') return false;
    return true;
  }

  loadExistingBookingForPayment(b: AiBookingStatus): void {
    if (!this.aiService || this.loadingBookingId() === b.booking_id) return;
    this.loadingBookingId.set(b.booking_id);
    this.bookingLoadError.set(null);

    this.aiService.getBookingDetail(b.booking_id).subscribe({
      next: (detail) => {
        this.loadingBookingId.set(null);
        this.confirmedBookingDetail.set(detail);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingBookingId.set(null);
        this.bookingLoadError.set(
          formatAiPlannerError(err, `Could not load Booking #${b.booking_id} for payment.`).message,
        );
      },
    });
  }

  onBookingConfirmed(detail: AiBookingDetailResponse): void {
    this.confirmedBookingDetail.set(detail);
    this.bookingConfirmed.emit(detail);
  }

  onPaymentUpdated(payment: AiPaymentResponse): void {
    this.confirmedBookingDetail.update((cur) =>
      cur ? { ...cur, payments: [...(cur.payments ?? []), payment] } : cur,
    );
    if (this.turn?.bookings?.length) {
      const target = this.turn.bookings.find((b) => b.booking_id === payment.booking_id);
      if (target) {
        target.payment_status = payment.status;
        target.payment_method = payment.method;
      }
    }
  }
}
