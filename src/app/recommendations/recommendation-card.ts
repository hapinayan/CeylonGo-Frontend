import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { RentalApi } from '../bike-rentals/rental-api';
import { AuthModalService } from '../core/services/auth-modal.service';
import { AuthService } from '../core/services/auth.service';
import { TourGuideService } from '../core/services/tour-guide.service';
import { SaveControl } from '../experiences/components/save-control';
import { FavoriteService } from '../features/artisan/services/favorite.service';
import { HomestayWishlistState } from '../traveler-wishlist/homestay-wishlist-state';
import { Card, Category, DETAIL_PATH, Unit } from './recommendation.models';

const LABEL: Record<Category, string> = {
  homestay: 'Homestay',
  adventure: 'Experience',
  guide: 'Tour Guide',
  bike: 'Motorbike & Scooter',
  bicycle: 'Bicycle Rental',
  artisan: 'Local Artisan',
};

const UNIT_LABEL: Record<Unit, string> = {
  per_night: '/ night',
  per_day: '/ day',
  per_participant: '/ person',
  per_person: '/ person',
  per_group: '/ group',
};

@Component({
  selector: 'app-recommendation-card',
  imports: [CurrencyPipe, RouterLink, SaveControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rec-card">
      <div class="rec-cover">
        @if (image() && !failed()) {
          <img
            [src]="image()"
            [alt]="card().title"
            loading="lazy"
            (error)="failed.set(true)"
          />
        } @else {
          <div class="rec-placeholder" role="img" [attr.aria-label]="card().title + ' image placeholder'">
            <svg width="44" height="44" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <circle cx="32" cy="32" r="28" fill="#DCEBFF" />
              <path
                d="M32 14C23.7 14 17 20.7 17 29c0 10.6 15 23 15 23s15-12.4 15-23c0-8.3-6.7-15-15-15Z"
                fill="#0066FF"
                fill-opacity="0.18"
                stroke="#0066FF"
                stroke-width="2.4"
              />
              <path d="M23 33l6-7 5 5 4-4 5 6" stroke="#082B5C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="37" cy="24" r="2.5" fill="#0066FF" />
            </svg>
            <span class="placeholder-brand">CeylonGo</span>
            <span class="placeholder-sub">{{ labels[card().category] }}</span>
          </div>
        }

        <div class="rec-cover-badges">
          <span class="rec-category-badge">{{ labels[card().category] }}</span>
          @if (isDemoListing()) {
            <span class="rec-demo-badge">Demo</span>
          }
        </div>

        <div class="rec-wishlist-wrap">
          @if (card().category === 'adventure') {
            <app-save-experience
              [id]="card().listing_id.toString()"
              [title]="card().title"
              [showLabel]="false"
            />
          } @else {
            <button
              type="button"
              class="rec-heart-btn"
              [class.saved]="isSaved()"
              [disabled]="wishlistBusy()"
              [attr.aria-pressed]="isSaved()"
              [attr.aria-label]="(isSaved() ? 'Remove ' : 'Save ') + card().title + ' to wishlist'"
              (click)="onToggleWishlist($event)"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                [attr.fill]="isSaved() ? '#0066FF' : 'none'"
                [attr.stroke]="isSaved() ? '#0066FF' : '#082B5C'"
                stroke-width="2.1"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          }
        </div>
      </div>

      <div class="rec-body">
        <h3 class="rec-title">{{ card().title }}</h3>

        @if (locationText()) {
          <div class="rec-location">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{{ locationText() }}</span>
          </div>
        }

        @if (card().rating !== null) {
          <div class="rec-rating" [attr.aria-label]="'Rated ' + card().rating + ' out of 5'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" stroke-width="1.5" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span class="rating-value">{{ card().rating }}</span>
            <span class="rating-scale">/ 5</span>
          </div>
        }

        @if (card().recommendation_reason) {
          <p class="rec-reason">{{ card().recommendation_reason }}</p>
        }

        <div class="rec-footer">
          <div class="rec-price-block">
            @if (formattedPrice(); as priceStr) {
              <span class="rec-price-label">From</span>
              <div class="rec-price-row">
                <span class="rec-price-amount">{{ priceStr }}</span>
                @if (pricingUnitLabel(); as unitStr) {
                  <span class="rec-price-unit">{{ unitStr }}</span>
                }
              </div>
            } @else if (card().starting_price !== null && card().currency && card().currency !== 'LKR') {
              <span class="rec-price-label">From</span>
              <div class="rec-price-row">
                <span class="rec-price-amount">{{ card().starting_price | currency: card().currency! : 'code' : '1.0-0' }}</span>
                @if (pricingUnitLabel(); as unitStr) {
                  <span class="rec-price-unit">{{ unitStr }}</span>
                }
              </div>
            } @else {
              <span class="rec-price-inquiry">
                {{ card().category === 'artisan' ? 'Local Craft Studio' : 'View pricing' }}
              </span>
            }
          </div>

          <a
            class="rec-view-btn"
            [routerLink]="[paths[card().category], card().listing_id]"
            [attr.aria-label]="'View details for ' + card().title"
          >
            <span>View Details</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      min-width: 0;
    }

    .rec-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #d8e8f8;
      border-radius: 18px;
      color: #082b5c;
      box-shadow: 0 4px 14px rgba(8, 43, 92, 0.05);
      transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
        box-shadow 0.24s cubic-bezier(0.16, 1, 0.3, 1),
        border-color 0.24s ease;
    }

    .rec-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 28px rgba(0, 102, 255, 0.12);
      border-color: #93c5fd;
    }

    .rec-card:hover .rec-cover img {
      transform: scale(1.04);
    }

    .rec-cover {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      background: #eaf5ff;
      flex-shrink: 0;
    }

    .rec-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.35s ease;
    }

    .rec-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: linear-gradient(145deg, #eaf5ff 0%, #dbeafe 100%);
      color: #082b5c;
      padding: 12px;
      text-align: center;
    }

    .placeholder-brand {
      font-size: 13px;
      font-weight: 800;
      color: #082b5c;
      letter-spacing: -0.01em;
    }

    .placeholder-sub {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
    }

    .rec-cover-badges {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 54px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      z-index: 2;
    }

    .rec-category-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(216, 232, 248, 0.95);
      color: #082b5c;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.01em;
      box-shadow: 0 2px 8px rgba(8, 43, 92, 0.1);
      backdrop-filter: blur(4px);
    }

    .rec-demo-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 9999px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      color: #92400e;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .rec-wishlist-wrap {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 2;
    }

    .rec-heart-btn,
    .rec-wishlist-wrap ::ng-deep .outline-control.favorite {
      width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid #e2e8f0;
      color: #082b5c;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(8, 43, 92, 0.14);
      transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
    }

    .rec-heart-btn:hover:not(:disabled),
    .rec-wishlist-wrap ::ng-deep .outline-control.favorite:hover:not(:disabled) {
      transform: scale(1.07);
      background: #ffffff;
      border-color: #93c5fd;
    }

    .rec-heart-btn.saved,
    .rec-wishlist-wrap ::ng-deep .outline-control.favorite[aria-pressed='true'] {
      background: #eaf5ff;
      border-color: #93c5fd;
      color: #0066ff;
    }

    .rec-wishlist-wrap ::ng-deep .outline-control.favorite svg {
      width: 17px;
      height: 17px;
      display: block;
    }

    .rec-wishlist-wrap ::ng-deep .outline-control.favorite[aria-pressed='true'] svg {
      fill: #0066ff;
      stroke: #0066ff;
    }

    .rec-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 16px;
      gap: 8px;
      min-width: 0;
    }

    .rec-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.35;
      color: #082b5c;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.7em;
    }

    .rec-location {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      min-width: 0;
    }

    .rec-location svg {
      flex-shrink: 0;
    }

    .rec-location span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rec-rating {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #082b5c;
    }

    .rec-rating .rating-scale {
      color: #64748b;
      font-weight: 500;
    }

    .rec-reason {
      margin: 2px 0 0;
      font-size: 12.5px;
      line-height: 1.45;
      color: #64748b;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .rec-footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 10px;
    }

    .rec-price-block {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .rec-price-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .rec-price-row {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 4px;
    }

    .rec-price-amount {
      font-size: 15px;
      font-weight: 800;
      color: #082b5c;
      white-space: nowrap;
    }

    .rec-price-unit {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      white-space: nowrap;
    }

    .rec-price-inquiry {
      font-size: 12.5px;
      font-weight: 600;
      color: #64748b;
    }

    .rec-view-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 8px 14px;
      border-radius: 10px;
      background-color: #0066ff;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
      box-shadow: 0 3px 10px rgba(0, 102, 255, 0.22);
      transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    }

    .rec-view-btn:hover {
      background-color: #0052cc;
      transform: translateY(-1px);
      box-shadow: 0 5px 14px rgba(0, 102, 255, 0.32);
    }

    .rec-view-btn:focus-visible {
      outline: 3px solid rgba(0, 102, 255, 0.4);
      outline-offset: 2px;
    }
  `,
})
export class RecommendationCard {
  private readonly authService = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  private readonly homestayWishlist = inject(HomestayWishlistState);
  private readonly rentalApi = inject(RentalApi);
  private readonly favoriteService = inject(FavoriteService);
  private readonly guideService = inject(TourGuideService);
  private readonly destroyRef = inject(DestroyRef);

  readonly card = input.required<Card>();
  readonly labels = LABEL;
  readonly paths = DETAIL_PATH;
  readonly failed = signal(false);
  readonly wishlistBusy = signal(false);
  private readonly savedOverride = signal<boolean | null>(null);

  readonly image = computed(() => {
    const source = this.card().cover_image_url;
    if (!source) return null;
    try {
      const url = new URL(source, new URL(environment.apiBaseUrl).origin);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  });

  readonly locationText = computed(() => {
    const loc = this.card().location?.trim();
    const dist = this.card().district?.trim();
    if (loc && dist && loc.toLowerCase() !== dist.toLowerCase() && !loc.toLowerCase().includes(dist.toLowerCase())) {
      return `${loc}, ${dist}`;
    }
    return loc || dist || '';
  });

  readonly formattedPrice = computed(() => {
    const raw = this.card().starting_price;
    const currency = this.card().currency;
    if (raw === null || raw === undefined || raw === '' || !currency) return null;
    const num = Number(raw);
    if (!Number.isFinite(num)) return null;
    if (currency.toUpperCase() === 'LKR') {
      return `LKR ${Math.round(num).toLocaleString('en-US')}`;
    }
    return null;
  });

  readonly pricingUnitLabel = computed(() => {
    const unit = this.card().pricing_unit;
    return unit ? (UNIT_LABEL[unit] ?? unit.replace('_', ' ')) : '';
  });

  readonly isDemoListing = computed(() => {
    const c = this.card() as Card & { is_demo?: boolean };
    return Boolean(c.is_demo);
  });

  readonly isSaved = computed(() => {
    const override = this.savedOverride();
    if (override !== null) return override;
    const c = this.card();
    switch (c.category) {
      case 'homestay':
        return this.homestayWishlist.ids().includes(c.listing_id);
      case 'artisan':
        return this.favoriteService.isBusinessSaved(c.listing_id);
      case 'guide':
        return this.guideService.isFavorite(String(c.listing_id));
      default:
        return false;
    }
  });

  constructor() {
    effect(() => {
      this.image();
      this.failed.set(false);
    });
    effect(() => {
      this.card().listing_id;
      this.savedOverride.set(null);
    });
  }

  onToggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const trigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    if (!this.authService.isAuthenticated()) {
      this.authModal.open('login', trigger, {
        type: 'wishlist',
        data: { listingId: this.card().listing_id },
      });
      return;
    }

    const c = this.card();
    const currentlySaved = this.isSaved();
    if (this.wishlistBusy()) return;

    switch (c.category) {
      case 'homestay': {
        this.wishlistBusy.set(true);
        this.homestayWishlist
          .change(c.listing_id, !currentlySaved)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (saved) => {
              this.savedOverride.set(saved);
              this.wishlistBusy.set(false);
            },
            error: () => this.wishlistBusy.set(false),
          });
        break;
      }
      case 'artisan': {
        this.wishlistBusy.set(true);
        this.favoriteService
          .toggleBusinessWishlist(c.listing_id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.savedOverride.set(res.isSaved);
              this.wishlistBusy.set(false);
            },
            error: () => this.wishlistBusy.set(false),
          });
        break;
      }
      case 'guide': {
        this.guideService.toggleFavorite(String(c.listing_id));
        this.savedOverride.set(!currentlySaved);
        break;
      }
      case 'bike':
      case 'bicycle': {
        this.wishlistBusy.set(true);
        this.rentalApi
          .toggleSaved(c.listing_id, currentlySaved)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              this.savedOverride.set(res?.saved ?? !currentlySaved);
              this.wishlistBusy.set(false);
            },
            error: (err) => {
              if (!currentlySaved && err?.status === 409) {
                this.savedOverride.set(true);
              }
              this.wishlistBusy.set(false);
            },
          });
        break;
      }
    }
  }
}
