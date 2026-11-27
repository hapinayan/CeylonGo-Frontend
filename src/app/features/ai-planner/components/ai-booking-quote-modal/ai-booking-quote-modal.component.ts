import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AiBookingProposal,
  AiBookingSelectionRequest,
  AiListingResult,
} from '../../models/ai-planner.models';
import { AiPlannerService, formatAiPlannerError } from '../../services/ai-planner.service';

@Component({
  selector: 'app-ai-booking-quote-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (listing) {
      <div class="quote-backdrop" role="dialog" aria-modal="true" aria-labelledby="ai-quote-title" (click)="closed.emit()">
        <form class="quote-modal" (click)="$event.stopPropagation()" (submit)="$event.preventDefault(); requestQuote()">
          <header class="modal-head">
            <div>
              <h2 id="ai-quote-title">Check Verified Availability &amp; Quote</h2>
              <p class="listing-sub">{{ listing.title }} · {{ listing.locality }}</p>
            </div>
            <button type="button" class="close-x" (click)="closed.emit()" aria-label="Close booking dialog">&times;</button>
          </header>

          <div class="modal-body">
            @if (listing.category === 'homestay' || listing.category === 'bike' || listing.category === 'bicycle') {
              <div class="field-pair">
                <label>
                  <span>{{ listing.category === 'homestay' ? 'Check-in Date *' : 'Pickup Date *' }}</span>
                  <input type="date" [(ngModel)]="startDate" name="startDate" required [disabled]="isLoading()" />
                </label>
                <label>
                  <span>{{ listing.category === 'homestay' ? 'Check-out Date *' : 'Return Date *' }}</span>
                  <input type="date" [(ngModel)]="endDate" name="endDate" required [disabled]="isLoading()" />
                </label>
              </div>
            } @else {
              <label>
                <span>Preferred Date *</span>
                <input type="date" [(ngModel)]="singleDay" name="singleDay" required [disabled]="isLoading()" />
              </label>
            }

            <label>
              <span>{{ quantityLabel }} *</span>
              <input type="number" min="1" max="50" [(ngModel)]="quantity" name="quantity" required [disabled]="isLoading()" />
            </label>

            @if (listing.details?.options?.length) {
              <label>
                <span>{{ optionLabel }}</span>
                <select [(ngModel)]="selectedOptionId" name="selectedOptionId" [disabled]="isLoading()">
                  <option [ngValue]="null">Auto / Standard Option</option>
                  @for (opt of listing.details!.options!; track opt.id) {
                    <option [ngValue]="opt.id">
                      {{ opt.title }} (Capacity: {{ opt.capacity }})
                    </option>
                  }
                </select>
              </label>
            }

            @if (errorMessage()) {
              <p class="error-box" role="alert">{{ errorMessage() }}</p>
            }
          </div>

          <footer class="modal-foot">
            <button type="button" class="btn-secondary" (click)="closed.emit()" [disabled]="isLoading()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="isLoading()">
              {{ isLoading() ? 'Verifying Quote...' : 'Get Verified Quote' }}
            </button>
          </footer>
        </form>
      </div>
    }
  `,
  styles: [`
    .quote-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(8, 43, 92, 0.55);
      display: grid;
      place-items: center;
      padding: 1rem;
    }

    .quote-modal {
      width: 100%;
      max-width: 470px;
      background: #ffffff;
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      h2 {
        margin: 0 0 0.2rem;
        color: #082b5c;
        font-size: 1.05rem;
      }
    }

    .listing-sub {
      margin: 0;
      color: #64748b;
      font-size: 0.84rem;
    }

    .close-x {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 1.2rem;
      cursor: pointer;
    }

    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        span {
          color: #334155;
          font-size: 0.82rem;
          font-weight: 600;
        }

        input,
        select {
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          padding: 0.5rem 0.65rem;
          font: inherit;
          font-size: 0.9rem;
        }
      }
    }

    .field-pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }

    .error-box {
      margin: 0;
      padding: 0.55rem 0.75rem;
      border-radius: 9px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.84rem;
    }

    .modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 0.55rem;
    }

    .btn-secondary {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.5rem 0.95rem;
      background: #ffffff;
      color: #082b5c;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary {
      border: none;
      border-radius: 9px;
      padding: 0.5rem 1.05rem;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;

      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }
  `],
})
export class AiBookingQuoteModalComponent implements OnChanges {
  private readonly aiService = inject(AiPlannerService);

  @Input() listing: AiListingResult | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() proposalReady = new EventEmitter<AiBookingProposal>();

  startDate = '';
  endDate = '';
  singleDay = '';
  quantity = 1;
  selectedOptionId: number | null = null;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get quantityLabel(): string {
    if (!this.listing) return 'Quantity';
    if (this.listing.category === 'homestay') return 'Rooms / Units';
    if (this.listing.category === 'bike' || this.listing.category === 'bicycle') return 'Vehicles';
    return 'Travelers / Participants';
  }

  get optionLabel(): string {
    if (!this.listing) return 'Option';
    if (this.listing.category === 'homestay') return 'Room Type';
    if (this.listing.category === 'guide') return 'Tour Package';
    return 'Activity Option';
  }

  ngOnChanges(): void {
    this.errorMessage.set(null);
    this.isLoading.set(false);
    this.selectedOptionId = this.listing?.details?.options?.[0]?.id ?? null;

    const today = new Date();
    const d1 = new Date(today.getTime() + 7 * 86400000);
    const d2 = new Date(today.getTime() + 9 * 86400000);
    this.startDate = d1.toISOString().slice(0, 10);
    this.endDate = d2.toISOString().slice(0, 10);
    this.singleDay = d1.toISOString().slice(0, 10);
    this.quantity = this.listing?.category === 'adventure' || this.listing?.category === 'guide' ? 2 : 1;
  }

  requestQuote(): void {
    if (!this.listing || this.isLoading()) return;

    const payload: AiBookingSelectionRequest = {
      listing_id: this.listing.listing_id,
      quantity: Math.max(1, Math.min(50, Number(this.quantity) || 1)),
    };

    if (this.listing.category === 'homestay' || this.listing.category === 'bike' || this.listing.category === 'bicycle') {
      if (!this.startDate || !this.endDate || this.endDate <= this.startDate) {
        this.errorMessage.set('Please select a valid end date after the start date.');
        return;
      }
      payload.starts_at = `${this.startDate}T14:00:00Z`;
      payload.ends_at = `${this.endDate}T11:00:00Z`;
      if (this.listing.category === 'homestay' && this.selectedOptionId) {
        payload.room_id = this.selectedOptionId;
      }
    } else {
      if (!this.singleDay) {
        this.errorMessage.set('Please select a preferred date.');
        return;
      }
      payload.day = this.singleDay;
      if (this.listing.category === 'guide' && this.selectedOptionId) {
        payload.package_id = this.selectedOptionId;
      } else if (this.listing.category === 'adventure' && this.selectedOptionId) {
        payload.slot_id = this.selectedOptionId;
      }
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.aiService.requestBookingQuote(payload).subscribe({
      next: (proposal) => {
        this.isLoading.set(false);
        this.proposalReady.emit(proposal);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          formatAiPlannerError(err, 'Unable to verify quote for those selections.').message,
        );
      },
    });
  }
}
