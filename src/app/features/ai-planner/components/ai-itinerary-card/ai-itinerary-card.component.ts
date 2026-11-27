import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import { AiItinerary, AiItineraryWeather, AiListingResult } from '../../models/ai-planner.models';
import { AiBudgetSummaryComponent } from '../ai-budget-summary/ai-budget-summary.component';
import { AiDayScheduleComponent } from '../ai-day-schedule/ai-day-schedule.component';
import { AiRouteMapComponent } from '../ai-route-map/ai-route-map.component';

@Component({
  selector: 'app-ai-itinerary-card',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    LkrCurrencyPipe,
    AiDayScheduleComponent,
    AiBudgetSummaryComponent,
    AiRouteMapComponent,
  ],
  template: `
    <section class="itinerary-card" aria-label="Generated Trip Itinerary">
      <header class="itin-header">
        <div>
          <span class="itin-eyebrow">Personalized CeylonGo Itinerary</span>
          <h2>{{ itinerary.plan.title }}</h2>
          <p class="itin-summary">{{ itinerary.plan.summary }}</p>
        </div>

        <div class="itin-meta-chips">
          @if (primaryDestination) {
            <span>{{ primaryDestination }}</span>
          }
          <span>{{ itinerary.plan.days.length }} {{ itinerary.plan.days.length === 1 ? 'Day' : 'Days' }}</span>
          <span>{{ itinerary.plan.travelers }} {{ itinerary.plan.travelers === 1 ? 'Traveler' : 'Travelers' }}</span>
          @if (itinerary.plan.start_date) {
            <span>Starts {{ itinerary.plan.start_date | date: 'mediumDate' }}</span>
          }
          <span>Budget: {{ itinerary.plan.budget_lkr | lkrCurrency }}</span>
        </div>

        @if (showActions) {
          <div class="itin-actions">
            <button type="button" class="btn-save" (click)="saveTrip.emit()" [disabled]="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Trip' }}
            </button>
            <button type="button" class="btn-action" (click)="modifyTrip.emit()">Modify Trip</button>
            <button type="button" class="btn-action" (click)="askAi.emit()">Ask AI</button>
            @if (itinerary.listings.length > 0) {
              <button type="button" class="btn-action" (click)="viewServices.emit()">
                View Recommended Services ({{ itinerary.listings.length }})
              </button>
            }
          </div>
        }
      </header>

      <div class="days-stack">
        @for (day of itinerary.plan.days; track day.day; let idx = $index) {
          <app-ai-day-schedule
            [day]="day"
            [dayWeather]="weatherForDay(day.day)"
            [listings]="itinerary.listings"
            [initiallyExpanded]="idx < 2"
            (listingSelected)="listingSelected.emit($event)"
          />
        }
      </div>

      <app-ai-budget-summary
        [itinerary]="itinerary"
        [allowAskCheaper]="showActions"
        (askCheaperAlternatives)="askCheaper.emit()"
      />

      <app-ai-route-map [days]="itinerary.plan.days" [listings]="itinerary.listings" />
    </section>
  `,
  styles: [`
    .itinerary-card {
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      background: #ffffff;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .itin-eyebrow {
      display: inline-block;
      color: #0066ff;
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.2rem;
    }

    h2 {
      margin: 0 0 0.3rem;
      color: #082b5c;
      font-size: 1.15rem;
      font-weight: 700;
    }

    .itin-summary {
      margin: 0 0 0.65rem;
      color: #475569;
      font-size: 0.89rem;
      line-height: 1.5;
    }

    .itin-meta-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.75rem;

      span {
        padding: 0.24rem 0.6rem;
        border-radius: 999px;
        background: #f5f8fc;
        border: 1px solid #e2e8f0;
        color: #082b5c;
        font-size: 0.78rem;
        font-weight: 600;
      }
    }

    .itin-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .btn-save {
      border: none;
      border-radius: 9px;
      padding: 0.45rem 0.9rem;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.83rem;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) { background: #0052cc; }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }

    .btn-action {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 0.45rem 0.85rem;
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

    .days-stack {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
  `],
})
export class AiItineraryCardComponent {
  @Input({ required: true }) itinerary!: AiItinerary;
  @Input() showActions = true;
  @Input() isSaving = false;

  @Output() saveTrip = new EventEmitter<void>();
  @Output() modifyTrip = new EventEmitter<void>();
  @Output() askAi = new EventEmitter<void>();
  @Output() viewServices = new EventEmitter<void>();
  @Output() askCheaper = new EventEmitter<void>();
  @Output() listingSelected = new EventEmitter<AiListingResult>();

  get primaryDestination(): string {
    return this.itinerary?.plan?.days?.[0]?.destination || '';
  }

  weatherForDay(dayNumber: number): AiItineraryWeather | null {
    const entries = this.itinerary?.weather;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return entries.find((item) => item.day === dayNumber) ?? null;
  }
}
