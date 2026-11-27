import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { weatherConditionGlyph, weatherIconUrl } from '../../../../core/models/weather-map.models';
import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import { AiItineraryWeather, AiListingResult, AiPlanDay } from '../../models/ai-planner.models';

@Component({
  selector: 'app-ai-day-schedule',
  standalone: true,
  imports: [CommonModule, LkrCurrencyPipe],
  template: `
    <article class="day-card">
      <button
        type="button"
        class="day-header"
        (click)="expanded.update((v) => !v)"
        [attr.aria-expanded]="expanded()"
      >
        <div class="day-title-group">
          <span class="day-pill">Day {{ day.day | number: '2.0-0' }}</span>
          <strong>{{ day.destination }}</strong>
        </div>
        <span class="chevron">{{ expanded() ? '−' : '+' }}</span>
      </button>

      @if (expanded()) {
        <div class="day-body">
          <ul class="slots-list">
            <li><span class="slot-label">Morning:</span> {{ day.morning }}</li>
            <li><span class="slot-label">Afternoon:</span> {{ day.afternoon }}</li>
            <li><span class="slot-label">Evening:</span> {{ day.evening }}</li>
            @if (day.transport) {
              <li><span class="slot-label">Transport:</span> {{ day.transport }}</li>
            }
          </ul>

          @if (dayWeather?.forecast; as forecast) {
            <div class="day-weather-card" data-testid="ai-day-weather">
              <div class="weather-head">
                <div class="weather-title-wrap">
                  @if (weatherIconUrl(forecast.condition.icon); as iconSrc) {
                    <img
                      [src]="iconSrc"
                      [alt]="forecast.condition.description || forecast.condition.name || 'Forecast icon'"
                      class="weather-icon"
                      width="32"
                      height="32"
                    />
                  } @else {
                    <span class="weather-glyph" aria-hidden="true">{{ weatherConditionGlyph(forecast.condition.icon) }}</span>
                  }
                  <div>
                    <strong>{{ forecast.condition.description || forecast.condition.name || 'Forecast' }}</strong>
                    <span class="weather-meta">
                      {{ dayWeather?.destination || day.destination }} &middot; {{ forecast.date }}
                    </span>
                  </div>
                </div>
                <div class="weather-badges">
                  <span class="temp-pill">
                    {{ forecast.min_temperature_c | number: '1.0-0' }}&deg;C &ndash; {{ forecast.max_temperature_c | number: '1.0-0' }}&deg;C
                  </span>
                  @if (forecast.rain_probability_percent !== null && forecast.rain_probability_percent !== undefined) {
                    <span class="rain-pill">
                      Rain {{ forecast.rain_probability_percent | number: '1.0-0' }}%
                    </span>
                  }
                  @if (dayWeather?.stale) {
                    <span class="stale-pill">Cached</span>
                  }
                </div>
              </div>

              @if (forecast.cautions.length > 0) {
                <ul class="weather-cautions">
                  @for (caution of forecast.cautions; track caution) {
                    <li>{{ caution }}</li>
                  }
                </ul>
              }

              <div class="weather-foot">
                <span>Source: {{ dayWeather?.source }}</span>
                @if (dayWeather?.fetched_at) {
                  <span>Updated: {{ dayWeather?.fetched_at | date: 'MMM d, HH:mm' : 'GMT+0530' }} (GMT+0530)</span>
                }
              </div>
            </div>
          }

          <div class="day-expenses">
            <span>Food (Est.): {{ day.estimated_food_lkr | lkrCurrency }}</span>
            <span>Transport (Est.): {{ day.estimated_transport_lkr | lkrCurrency }}</span>
            <span>Other (Est.): {{ day.estimated_other_lkr | lkrCurrency }}</span>
          </div>

          @if (matchedListings().length > 0) {
            <div class="day-services">
              <span class="services-label">Recommended Services:</span>
              <div class="service-pills">
                @for (item of matchedListings(); track item.ref) {
                  <button
                    type="button"
                    class="service-pill"
                    (click)="listingSelected.emit(item)"
                  >
                    {{ item.title }} ({{ item.locality }})
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </article>
  `,
  styles: [`
    .day-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      overflow: hidden;
    }

    .day-header {
      width: 100%;
      padding: 0.78rem 0.95rem;
      border: none;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      text-align: left;

      &:hover {
        background: #eaf2ff;
      }
    }

    .day-title-group {
      display: flex;
      align-items: center;
      gap: 0.55rem;

      strong {
        color: #082b5c;
        font-size: 0.92rem;
      }
    }

    .day-pill {
      padding: 0.2rem 0.55rem;
      border-radius: 7px;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .chevron {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0066ff;
    }

    .day-body {
      padding: 0.85rem 0.95rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .slots-list {
      margin: 0;
      padding-left: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #1e293b;
      font-size: 0.87rem;
      line-height: 1.5;
    }

    .slot-label {
      color: #082b5c;
      font-weight: 600;
    }

    .day-expenses {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      padding-top: 0.45rem;
      border-top: 1px solid #f1f5f9;
      color: #64748b;
      font-size: 0.78rem;
    }

    .day-services {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .services-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #082b5c;
    }

    .service-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .service-pill {
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 0.26rem 0.6rem;
      background: #eaf2ff;
      color: #0066ff;
      font-size: 0.77rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #dbeafe;
      }
    }

    .day-weather-card {
      padding: 0.65rem 0.8rem;
      border-radius: 10px;
      background: #f8fbff;
      border: 1px solid #dbeafe;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .weather-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .weather-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      strong {
        display: block;
        color: #082b5c;
        font-size: 0.84rem;
      }
    }

    .weather-icon {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .weather-glyph {
      font-size: 1.15rem;
      line-height: 1;
    }

    .weather-meta {
      display: block;
      font-size: 0.75rem;
      color: #64748b;
    }

    .weather-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
    }

    .temp-pill,
    .rain-pill,
    .stale-pill {
      padding: 0.16rem 0.5rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 600;
    }

    .temp-pill {
      background: #eaf2ff;
      color: #0052cc;
    }

    .rain-pill {
      background: #e0f2fe;
      color: #0369a1;
    }

    .stale-pill {
      background: #fef3c7;
      color: #92400e;
    }

    .weather-cautions {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.77rem;
      color: #92400e;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .weather-foot {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.4rem;
      font-size: 0.72rem;
      color: #64748b;
    }
  `],
})
export class AiDayScheduleComponent {
  @Input({ required: true }) day!: AiPlanDay;
  @Input() dayWeather: AiItineraryWeather | null = null;
  @Input() listings: AiListingResult[] = [];
  @Input() initiallyExpanded = true;

  readonly weatherIconUrl = weatherIconUrl;
  readonly weatherConditionGlyph = weatherConditionGlyph;

  @Output() listingSelected = new EventEmitter<AiListingResult>();

  readonly expanded = signal(true);

  ngOnInit(): void {
    this.expanded.set(this.initiallyExpanded);
  }

  matchedListings(): AiListingResult[] {
    const refs = this.day?.service_refs ?? [];
    if (!refs.length) return [];
    const byRef = new Map((this.listings ?? []).map((l) => [l.ref, l]));
    return refs.map((r) => byRef.get(r)).filter((x): x is AiListingResult => !!x);
  }
}
