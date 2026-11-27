import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import { AiSavedTrip } from '../../models/ai-planner.models';

@Component({
  selector: 'app-ai-saved-trip-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, LkrCurrencyPipe],
  template: `
    <article class="saved-trip-card">
      <div class="card-main">
        @if (isRenaming()) {
          <form class="rename-row" (submit)="$event.preventDefault(); saveRename()">
            <input
              type="text"
              maxlength="120"
              [(ngModel)]="titleDraft"
              name="savedTripRename"
              aria-label="Trip title"
            />
            <button type="submit" class="btn-save-sm">Save</button>
            <button type="button" class="btn-cancel-sm" (click)="isRenaming.set(false)">Cancel</button>
          </form>
        } @else {
          <h3>{{ trip.title }}</h3>
        }

        <p class="trip-summary">{{ trip.itinerary.plan.summary }}</p>

        <div class="trip-meta">
          @if (primaryDestination) {
            <span>{{ primaryDestination }}</span>
          }
          <span>{{ trip.itinerary.plan.days.length }} {{ trip.itinerary.plan.days.length === 1 ? 'Day' : 'Days' }}</span>
          <span>{{ trip.itinerary.plan.travelers }} {{ trip.itinerary.plan.travelers === 1 ? 'Traveler' : 'Travelers' }}</span>
          <span>Budget: {{ trip.itinerary.plan.budget_lkr | lkrCurrency }}</span>
          <span>Saved {{ trip.created_at | date: 'mediumDate' }}</span>
        </div>
      </div>

      <div class="card-actions">
        <a [routerLink]="['/ai-planner/saved', trip.id]" class="btn-view">View Trip</a>
        <button type="button" class="btn-outline" (click)="startRename()">Rename</button>
        <button type="button" class="btn-danger-outline" (click)="deleteRequested.emit(trip)">Delete</button>
      </div>
    </article>
  `,
  styles: [`
    .saved-trip-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #ffffff;
      padding: 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }

    h3 {
      margin: 0 0 0.3rem;
      color: #082b5c;
      font-size: 1.05rem;
      font-weight: 700;
    }

    .trip-summary {
      margin: 0 0 0.65rem;
      color: #475569;
      font-size: 0.88rem;
      line-height: 1.5;
    }

    .trip-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;

      span {
        padding: 0.22rem 0.58rem;
        border-radius: 999px;
        background: #f5f8fc;
        border: 1px solid #e2e8f0;
        color: #082b5c;
        font-size: 0.77rem;
        font-weight: 600;
      }
    }

    .rename-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.5rem;

      input {
        flex: 1;
        min-width: 180px;
        border: 1px solid #0066ff;
        border-radius: 8px;
        padding: 0.38rem 0.6rem;
        font: inherit;
      }
    }

    .btn-save-sm {
      border: none;
      border-radius: 8px;
      padding: 0.38rem 0.75rem;
      background: #0066ff;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .btn-cancel-sm {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.38rem 0.75rem;
      background: #ffffff;
      color: #475569;
      font-size: 0.82rem;
      cursor: pointer;
    }

    .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      padding-top: 0.55rem;
      border-top: 1px solid #f1f5f9;
    }

    .btn-view {
      border: none;
      border-radius: 9px;
      padding: 0.44rem 0.9rem;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.83rem;
      font-weight: 600;
      text-decoration: none;

      &:hover { background: #0052cc; }
    }

    .btn-outline {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.44rem 0.85rem;
      background: #ffffff;
      color: #082b5c;
      font-size: 0.83rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        border-color: #0066ff;
        color: #0066ff;
      }
    }

    .btn-danger-outline {
      border: 1px solid #fecaca;
      border-radius: 9px;
      padding: 0.44rem 0.85rem;
      background: #ffffff;
      color: #dc2626;
      font-size: 0.83rem;
      font-weight: 600;
      cursor: pointer;

      &:hover { background: #fef2f2; }
    }
  `],
})
export class AiSavedTripCardComponent {
  @Input({ required: true }) trip!: AiSavedTrip;
  @Output() renamed = new EventEmitter<{ id: number; title: string }>();
  @Output() deleteRequested = new EventEmitter<AiSavedTrip>();

  readonly isRenaming = signal(false);
  titleDraft = '';

  get primaryDestination(): string {
    return this.trip?.itinerary?.plan?.days?.[0]?.destination || '';
  }

  startRename(): void {
    this.titleDraft = this.trip.title;
    this.isRenaming.set(true);
  }

  saveRename(): void {
    const next = this.titleDraft.trim();
    this.isRenaming.set(false);
    if (next && next !== this.trip.title) {
      this.renamed.emit({ id: this.trip.id, title: next });
    }
  }
}
