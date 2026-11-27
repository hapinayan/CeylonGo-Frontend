import { Component, computed, inject, input, signal, effect } from '@angular/core';
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
const GENERAL_REASONS = new Set(['Popular among travelers', 'Explore this published service']);
type Status = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-recommendations',
  imports: [RecommendationCard, RouterLink],
  template: `
    @if (visibleState() === 'loading') {
      <section class="wrap" aria-busy="true" aria-label="Loading recommendations">
        <div class="grid">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="skeleton" aria-hidden="true"></div>
          }
        </div>
      </section>
    } @else if (visibleState() === 'error') {
      <section class="wrap">
        <p>Recommendations are temporarily unavailable.</p>
        <button type="button" (click)="retry.update(advance)">Try again</button>
      </section>
    } @else {
      @for (group of groups(); track group.recommendation_type; let first = $first) {
        <section class="wrap">
          <header>
            <h2>{{ titles[group.recommendation_type] }}</h2>
            @if (first && sourceId() === null && api.session()) {
              <a routerLink="/profile" fragment="prefs-heading">
                {{ isPersonal() ? 'Edit Interests' : 'Set Your Travel Interests' }}
              </a>
            }
          </header>
          <div class="grid">
            @for (card of group.items; track card.listing_id) {
              <app-recommendation-card [card]="card" />
            }
          </div>
        </section>
      } @empty {
        @if (sourceId() === null) {
          <section class="wrap">
            <p>No recommendations are available yet.</p>
            @if (api.session()) {
              <a routerLink="/profile" fragment="prefs-heading">Set Your Travel Interests</a>
            }
          </section>
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
      color: #142747;
      font-family: Inter, system-ui, sans-serif;
    }
    .wrap {
      max-width: 1240px;
      padding: 1.8rem clamp(1rem, 4vw, 2.5rem);
      margin: auto;
    }
    header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    h2 {
      margin: 0;
      font-size: clamp(1.35rem, 3vw, 2rem);
    }
    a,
    button {
      color: #155ac6;
      font: inherit;
      font-weight: 650;
    }
    button {
      background: white;
      border: 1px solid currentColor;
      border-radius: 0.6rem;
      padding: 0.55rem 0.85rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1.1rem;
    }
    .skeleton {
      height: 15rem;
      background: #edf2f8;
      border-radius: 16px;
      animation: pulse 1.5s infinite alternate;
    }
    @keyframes pulse {
      to {
        opacity: 0.48;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
      }
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 480px) {
      .grid {
        grid-template-columns: minmax(0, 1fr);
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
            ? this.api.home({ limit: 4 }, !session).pipe(map((home) => home.sections))
            : this.api.similar(id, { limit: 4 }).pipe(map((group) => [group]));
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
      if (existing) existing.items.push(...items.slice(0, Math.max(0, 4 - existing.items.length)));
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
