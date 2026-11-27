import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { Category, Group } from './recommendation.models';
import { RecommendationCard } from './recommendation-card';
import { RecommendationService } from './recommendation.service';

const TITLES: Record<Group['recommendation_type'], string> = {
  recommended_for_you: 'Recommended for You',
  because_you_viewed: 'Because You Viewed',
  based_on_your_interests: 'Based on Your Interests',
  favorite_destinations: 'Explore Your Favorite Destinations',
  popular_experiences: 'Popular Experiences',
  discover_something_new: 'Discover Something New',
  similar_services: 'Similar Services',
};
const SUBTITLES: Record<Group['recommendation_type'], string> = {
  recommended_for_you: 'Curated stays, experiences and local services matched to your journey.',
  because_you_viewed: 'More authentic options inspired by listings you explored recently.',
  based_on_your_interests: 'Handpicked around your saved travel interests across Sri Lanka.',
  favorite_destinations: 'Top stays and activities in destinations you prefer.',
  popular_experiences: 'Highly rated homestays, local guides, rentals and authentic experiences.',
  discover_something_new: 'Fresh ideas and hidden gems beyond your usual travel style.',
  similar_services: 'Comparable local listings you may also want to explore.',
};
const GENERAL_REASONS = new Set(['Popular among travelers', 'Explore this published service']);
type Status = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-recommendations',
  imports: [RecommendationCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibleState() === 'loading') {
      <section class="rec-section" aria-busy="true" aria-label="Loading recommendations">
        <div class="rec-header">
          <div class="rec-header-text">
            <div class="skeleton-title" aria-hidden="true"></div>
            <div class="skeleton-subtitle" aria-hidden="true"></div>
          </div>
        </div>
        <div class="rec-grid">
          @for (item of [1, 2, 3, 4, 5]; track item) {
            <div class="skeleton-card" aria-hidden="true">
              <div class="skeleton-cover"></div>
              <div class="skeleton-body">
                <div class="skeleton-line skeleton-line-lg"></div>
                <div class="skeleton-line skeleton-line-sm"></div>
                <div class="skeleton-line skeleton-line-md"></div>
                <div class="skeleton-footer">
                  <div class="skeleton-price"></div>
                  <div class="skeleton-btn"></div>
                </div>
              </div>
            </div>
          }
        </div>
      </section>
    } @else if (visibleState() === 'error') {
      <section class="rec-section">
        <div class="rec-status-box">
          <p class="rec-status-text">Recommendations are temporarily unavailable.</p>
          <button type="button" class="rec-retry-btn" (click)="retry.update(advance)">Try again</button>
        </div>
      </section>
    } @else {
      @for (group of groups(); track group.recommendation_type; let first = $first) {
        <section class="rec-section" [attr.aria-labelledby]="'rec-heading-' + group.recommendation_type">
          <header class="rec-header">
            <div class="rec-header-text">
              <h2 [id]="'rec-heading-' + group.recommendation_type">{{ titles[group.recommendation_type] }}</h2>
              <p class="rec-subtitle">{{ subtitles[group.recommendation_type] }}</p>
            </div>
            @if (first && sourceId() === null && api.session()) {
              <a class="rec-prefs-link" routerLink="/profile" fragment="prefs-heading">
                {{ isPersonal() ? 'Edit Interests' : 'Set Your Travel Interests' }}
              </a>
            }
          </header>
          <div class="rec-grid">
            @for (card of group.items; track card.listing_id) {
              <app-recommendation-card [card]="card" />
            }
          </div>
        </section>
      } @empty {
        @if (sourceId() === null) {
          <section class="rec-section">
            <div class="rec-status-box">
              <p class="rec-status-text">No recommendations are available yet.</p>
              @if (api.session()) {
                <a class="rec-prefs-link" routerLink="/profile" fragment="prefs-heading">Set Your Travel Interests</a>
              }
            </div>
          </section>
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      color: #082b5c;
      font-family: var(--cg-font, 'Inter', system-ui, sans-serif);
    }

    .rec-section {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: 28px var(--cg-page-padding, 40px);
      box-sizing: border-box;
    }

    .rec-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 22px;
    }

    .rec-header-text {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      color: #082b5c;
      letter-spacing: -0.015em;
      line-height: 1.25;
    }

    .rec-subtitle {
      margin: 0;
      font-size: 14.5px;
      color: #64748b;
      line-height: 1.5;
    }

    .rec-prefs-link {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border-radius: 9999px;
      border: 1.5px solid #0066ff;
      background: #ffffff;
      color: #0066ff;
      font-size: 13.5px;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: background-color 0.18s ease, color 0.18s ease;
    }

    .rec-prefs-link:hover {
      background: #eaf5ff;
      color: #0052cc;
    }

    .rec-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 20px;
      align-items: stretch;
    }

    @media (max-width: 1439px) {
      .rec-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    @media (max-width: 1120px) {
      .rec-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 820px) {
      .rec-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
    }

    @media (max-width: 540px) {
      .rec-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      h2 {
        font-size: 21px;
      }
    }

    .rec-status-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      padding: 20px 24px;
      background: #f8fbff;
      border: 1px solid #d8e8f8;
      border-radius: 16px;
    }

    .rec-status-text {
      margin: 0;
      font-size: 14.5px;
      font-weight: 500;
      color: #475569;
    }

    .rec-retry-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1.5px solid #0066ff;
      background: #0066ff;
      color: #ffffff;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.18s ease;
    }

    .rec-retry-btn:hover {
      background: #0052cc;
      border-color: #0052cc;
    }

    /* LOADING SKELETONS */
    .skeleton-title,
    .skeleton-subtitle,
    .skeleton-cover,
    .skeleton-line,
    .skeleton-price,
    .skeleton-btn {
      background: linear-gradient(90deg, #eaf5ff 25%, #f3f8ff 50%, #eaf5ff 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }

    .skeleton-title {
      width: 240px;
      height: 26px;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    .skeleton-subtitle {
      width: 340px;
      max-width: 100%;
      height: 16px;
      border-radius: 6px;
    }

    .skeleton-card {
      background: #ffffff;
      border: 1px solid #d8e8f8;
      border-radius: 18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .skeleton-cover {
      width: 100%;
      aspect-ratio: 16 / 10;
    }

    .skeleton-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .skeleton-line {
      height: 14px;
      border-radius: 6px;
    }

    .skeleton-line-lg {
      width: 85%;
      height: 18px;
    }

    .skeleton-line-md {
      width: 72%;
    }

    .skeleton-line-sm {
      width: 55%;
    }

    .skeleton-footer {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .skeleton-price {
      width: 84px;
      height: 22px;
      border-radius: 6px;
    }

    .skeleton-btn {
      width: 98px;
      height: 34px;
      border-radius: 10px;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .skeleton-title,
      .skeleton-subtitle,
      .skeleton-cover,
      .skeleton-line,
      .skeleton-price,
      .skeleton-btn {
        animation: none;
      }
    }
  `,
})
export class Recommendations {
  readonly api = inject(RecommendationService);
  readonly sourceId = input<number | null>(null);
  readonly category = input<Category | null>(null);
  readonly retry = signal(0);
  readonly advance = (value: number) => value + 1;
  readonly titles = TITLES;
  readonly subtitles = SUBTITLES;
  private readonly result = toSignal(
    combineLatest([
      toObservable(this.sourceId),
      this.api.session$,
      this.api.revision$,
      toObservable(this.retry),
    ]).pipe(
      switchMap(([id, session, revision]) => {
        const response =
          id === null
            ? this.api.home({ limit: 5 }, !session).pipe(map((home) => home.sections))
            : this.api.similar(id, { limit: 5 }).pipe(map((group) => [group]));
        const state = (status: Status, groups: Group[] = []) => ({
          status,
          groups,
          session,
          revision,
          id,
        });
        return response.pipe(
          map((groups) => state('ready', groups)),
          catchError(() => of(state('error'))),
          startWith(state('loading')),
        );
      }),
    ),
  );
  readonly visibleState = computed(() => {
    const result = this.result();
    return result?.session === this.api.session() &&
      result?.id === this.sourceId() &&
      result?.revision === this.api.revision()
      ? result.status
      : 'loading';
  });
  readonly groups = computed(() => {
    if (this.visibleState() !== 'ready') return [];
    const groups: Group[] = [];
    const seen = new Set<number>(this.sourceId() === null ? [] : [this.sourceId()!]);
    const source = this.result()!.groups;
    const ordered = [...source].sort(
      (a, b) =>
        Number(b.recommendation_type === 'recommended_for_you') -
        Number(a.recommendation_type === 'recommended_for_you'),
    );
    for (const group of ordered) {
      const items = group.items.filter((card) => {
        if (seen.has(card.listing_id)) return false;
        seen.add(card.listing_id);
        return true;
      });
      if (!items.length) continue;
      const kind =
        group.recommendation_type === 'recommended_for_you' &&
        items.every((card) => GENERAL_REASONS.has(card.recommendation_reason))
          ? 'popular_experiences'
          : group.recommendation_type;
      const existing = groups.find((value) => value.recommendation_type === kind);
      if (existing) existing.items.push(...items.slice(0, Math.max(0, 5 - existing.items.length)));
      else groups.push({ recommendation_type: kind, items });
    }
    return groups.slice(0, 3);
  });
  readonly isPersonal = computed(() =>
    this.groups().some((group) =>
      [
        'recommended_for_you',
        'because_you_viewed',
        'based_on_your_interests',
        'favorite_destinations',
      ].includes(group.recommendation_type),
    ),
  );
  constructor() {
    effect(() => {
      const id = this.sourceId();
      const category = this.category();
      if (id && category) this.api.track({ event_type: 'view', listing_id: id, category });
    });
  }
}
