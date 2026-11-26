import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LkrCurrencyPipe } from '../../../../shared/pipes/lkr-currency.pipe';
import {
  AiListingResult,
  AiQuote,
  getServiceCategoryLabel,
  getServiceDetailRoute,
  getServicePriceUnit,
} from '../../models/ai-planner.models';
import { AiPlannerService } from '../../services/ai-planner.service';

@Component({
  selector: 'app-ai-service-card',
  standalone: true,
  imports: [CommonModule, RouterLink, LkrCurrencyPipe],
  template: `
    <article class="service-card">
      <div class="card-media">
        @if (photoUrl(); as src) {
          <img [src]="src" [alt]="listing.title" loading="lazy" (error)="photoUrl.set(null)" />
        } @else {
          <div class="media-placeholder" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        }
        <span class="cat-badge">{{ categoryLabel }}</span>
        @if (isDemoTitle) {
          <span class="demo-badge">Demo Listing</span>
        }
      </div>

      <div class="card-body">
        <div class="card-top">
          <h3>{{ listing.title }}</h3>
          <p class="loc-line">{{ listing.locality }}{{ listing.district ? ', ' + listing.district : '' }}</p>
        </div>

        @if (verifiedQuote; as q) {
          <div class="quote-chip">
            Verified Quote: <strong>{{ q.total_lkr | lkrCurrency }}</strong>
            @if (q.motorcycle_license_required) {
              <span>· License Required</span>
            }
          </div>
        } @else if (listing.advertised_price_lkr) {
          <div class="price-line">
            <strong>{{ listing.advertised_price_lkr | lkrCurrency }}</strong>
            @if (priceUnit) {
              <span>{{ priceUnit }}</span>
            }
          </div>
        }

        @if (listing.details?.craft_category) {
          <p class="meta-text">Craft: {{ listing.details!.craft_category }}</p>
        }
        @if (listing.details?.duration_minutes) {
          <p class="meta-text">Duration: {{ listing.details!.duration_minutes }} mins</p>
        }
        @if (listing.details?.amenities?.length) {
          <div class="chip-row">
            @for (a of listing.details!.amenities!.slice(0, 3); track a) {
              <span class="mini-chip">{{ a }}</span>
            }
          </div>
        }

        <div class="card-actions">
          @if (listing.category === 'artisan') {
            <a [routerLink]="detailRoute" class="btn-outline">View Business</a>
            <a [routerLink]="detailRoute" fragment="products" class="btn-outline">View Products</a>
            <a [routerLink]="['/artisans', listing.listing_id, 'contact']" class="btn-primary-sm">Contact Business</a>
          } @else {
            <a [routerLink]="detailRoute" class="btn-outline">View Details</a>
            <button
              type="button"
              class="btn-primary-sm"
              (click)="bookWithAi.emit(listing)"
              [disabled]="busy"
            >
              Book with AI
            </button>
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    .service-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .card-media {
      position: relative;
      height: 132px;
      background: #f5f8fc;
      display: grid;
      place-items: center;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }

    .media-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #eaf2ff;
      display: grid;
      place-items: center;
    }

    .cat-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
      background: rgba(8, 43, 92, 0.86);
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .demo-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 0.18rem 0.5rem;
      border-radius: 999px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .card-body {
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      flex: 1;
    }

    h3 {
      margin: 0 0 0.18rem;
      color: #082b5c;
      font-size: 0.94rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .loc-line {
      margin: 0;
      color: #64748b;
      font-size: 0.79rem;
    }

    .price-line {
      color: #0f172a;
      font-size: 0.88rem;
      display: flex;
      gap: 0.3rem;
      align-items: baseline;

      strong { color: #0066ff; }
      span { color: #64748b; font-size: 0.76rem; }
    }

    .quote-chip {
      padding: 0.35rem 0.55rem;
      border-radius: 8px;
      background: #eaf2ff;
      color: #082b5c;
      font-size: 0.78rem;
    }

    .meta-text {
      margin: 0;
      color: #475569;
      font-size: 0.78rem;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }

    .mini-chip {
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
      font-size: 0.72rem;
    }

    .card-actions {
      margin-top: auto;
      padding-top: 0.35rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .btn-outline {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.38rem 0.65rem;
      background: #ffffff;
      color: #082b5c;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: none;

      &:hover {
        border-color: #0066ff;
        color: #0066ff;
      }
    }

    .btn-primary-sm {
      border: none;
      border-radius: 8px;
      padding: 0.38rem 0.72rem;
      background: #0066ff;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;

      &:hover:not(:disabled) { background: #0052cc; }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }
  `],
})
export class AiServiceCardComponent implements OnInit {
  private readonly aiService = inject(AiPlannerService);

  @Input({ required: true }) listing!: AiListingResult;
  @Input() verifiedQuote: AiQuote | null = null;
  @Input() busy = false;

  @Output() bookWithAi = new EventEmitter<AiListingResult>();

  readonly photoUrl = signal<string | null>(null);

  get categoryLabel(): string {
    return getServiceCategoryLabel(this.listing.category);
  }

  get detailRoute(): string[] {
    return getServiceDetailRoute(this.listing);
  }

  get priceUnit(): string {
    return getServicePriceUnit(this.listing.category);
  }

  get isDemoTitle(): boolean {
    return /\[demo\]|\bsample\b/i.test(this.listing.title || '');
  }

  ngOnInit(): void {
    this.aiService
      .resolveListingPhoto(this.listing.category, this.listing.listing_id)
      .subscribe((url) => this.photoUrl.set(url));
  }
}
