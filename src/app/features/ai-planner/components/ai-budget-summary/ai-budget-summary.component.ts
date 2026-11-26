import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed } from '@angular/core';

import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import { AiItinerary, AiServiceCategory } from '../../models/ai-planner.models';

@Component({
  selector: 'app-ai-budget-summary',
  standalone: true,
  imports: [CommonModule, LkrCurrencyPipe],
  template: `
    <section class="budget-card" aria-label="Trip Budget Summary">
      <header class="budget-head">
        <div>
          <h3>Trip Budget Summary</h3>
          <p class="budget-note">Verified service quotes and estimated daily expenses are separated below.</p>
        </div>
        @if (isOverBudget()) {
          <span class="over-badge">Over Budget</span>
        }
      </header>

      <div class="budget-grid">
        <div class="metric-row">
          <span>Traveler Budget</span>
          <strong>{{ itinerary.plan.budget_lkr | lkrCurrency }}</strong>
        </div>

        <div class="divider"></div>

        <div class="metric-row sub">
          <span>Accommodation Quotes (Verified)</span>
          <span>{{ categoryTotals().homestay | lkrCurrency }}</span>
        </div>
        <div class="metric-row sub">
          <span>Activity Quotes (Verified)</span>
          <span>{{ categoryTotals().adventure | lkrCurrency }}</span>
        </div>
        <div class="metric-row sub">
          <span>Tour Guide Quotes (Verified)</span>
          <span>{{ categoryTotals().guide | lkrCurrency }}</span>
        </div>
        <div class="metric-row sub">
          <span>Rental Quotes (Verified)</span>
          <span>{{ categoryTotals().rental | lkrCurrency }}</span>
        </div>
        <div class="metric-row">
          <span>Verified Quoted Services Total</span>
          <strong>{{ itinerary.quoted_services_lkr | lkrCurrency }}</strong>
        </div>

        <div class="divider"></div>

        <div class="metric-row sub">
          <span>Estimated Food, Transport &amp; Other</span>
          <span>{{ itinerary.estimated_other_lkr | lkrCurrency }}</span>
        </div>
        @if (unquotedListingsCount() > 0) {
          <div class="metric-row unpriced">
            <span>Services Not Yet Quoted ({{ unquotedListingsCount() }})</span>
            <span>Request quote to verify price</span>
          </div>
        }

        <div class="metric-row total">
          <span>Total Estimated Trip Cost</span>
          <strong>{{ itinerary.estimated_total_lkr | lkrCurrency }}</strong>
        </div>
        <div class="metric-row" [class.negative]="isOverBudget()">
          <span>Remaining Budget</span>
          <strong>{{ itinerary.remaining_budget_lkr | lkrCurrency }}</strong>
        </div>
      </div>

      @if (isOverBudget() && allowAskCheaper) {
        <div class="over-warning" role="alert">
          <p>Estimated trip costs exceed your budget. Ask AI to adjust stays, activities, or trip duration.</p>
          <button type="button" class="btn-cheaper" (click)="askCheaperAlternatives.emit()">
            Ask AI for Cheaper Alternatives
          </button>
        </div>
      }
    </section>
  `,
  styles: [`
    .budget-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f5f8fc;
      padding: 0.95rem 1.05rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .budget-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;

      h3 {
        margin: 0 0 0.15rem;
        color: #082b5c;
        font-size: 0.96rem;
        font-weight: 700;
      }
    }

    .budget-note {
      margin: 0;
      color: #64748b;
      font-size: 0.78rem;
    }

    .over-badge {
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      font-size: 0.73rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .budget-grid {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.86rem;
      color: #0f172a;

      &.sub {
        color: #475569;
        font-size: 0.82rem;
      }

      &.unpriced {
        color: #64748b;
        font-size: 0.79rem;
        font-style: italic;
      }

      &.total {
        font-size: 0.94rem;
        color: #082b5c;
        font-weight: 700;
      }

      &.negative strong {
        color: #dc2626;
      }
    }

    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 0.2rem 0;
    }

    .over-warning {
      padding: 0.7rem 0.85rem;
      border-radius: 10px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      p {
        margin: 0;
        color: #92400e;
        font-size: 0.82rem;
      }
    }

    .btn-cheaper {
      align-self: flex-start;
      border: 1px solid #0066ff;
      border-radius: 8px;
      padding: 0.38rem 0.78rem;
      background: #ffffff;
      color: #0066ff;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #eaf2ff;
      }
    }
  `],
})
export class AiBudgetSummaryComponent {
  @Input({ required: true }) itinerary!: AiItinerary;
  @Input() allowAskCheaper = true;
  @Output() askCheaperAlternatives = new EventEmitter<void>();

  readonly categoryTotals = computed(() => {
    const totals = { homestay: 0, adventure: 0, guide: 0, rental: 0 };
    for (const item of this.itinerary?.quotes ?? []) {
      const amt = Number(item.quote?.total_lkr);
      if (!Number.isFinite(amt)) continue;
      const cat: AiServiceCategory = item.quote.category;
      if (cat === 'homestay') totals.homestay += amt;
      else if (cat === 'adventure') totals.adventure += amt;
      else if (cat === 'guide') totals.guide += amt;
      else if (cat === 'bike' || cat === 'bicycle') totals.rental += amt;
    }
    return totals;
  });

  readonly unquotedListingsCount = computed(() => {
    const quotedIds = new Set((this.itinerary?.quotes ?? []).map((q) => q.quote.listing_id));
    return (this.itinerary?.listings ?? []).filter(
      (l) => l.category !== 'artisan' && !quotedIds.has(l.listing_id),
    ).length;
  });

  readonly isOverBudget = computed(() => {
    const remaining = Number(this.itinerary?.remaining_budget_lkr);
    return Number.isFinite(remaining) && remaining < 0;
  });
}
