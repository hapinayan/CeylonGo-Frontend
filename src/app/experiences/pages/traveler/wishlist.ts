import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of, switchMap, map } from 'rxjs';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { ExperienceCard } from '../../components/experience-card';
import { ExperienceIcon } from '../../components/icon';
import { Pagination } from '../../components/pagination';
import { toActivityCard } from '../../services/activities-api';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { WishlistState } from '../../services/wishlist-state';
import { loadState } from '../../services/workflow-state';

@Component({
  imports: [
    ExperienceCard,
    Pagination,
    ExperienceIcon,
  ],
  styleUrls: ['../discover/discover.scss', './traveler.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="experiences-shell">
      <main class="discover traveler-workflow">
        <div class="workflow-page-header">
          <div class="header-title-wrap">
            <h1>Saved Experiences</h1>
            <p class="workflow-lead-p">Keep track of your saved activities across Sri Lanka.</p>
          </div>
        </div>

        @if (!session.account()) {
          <div class="workflow-card signin-prompt">
            <h2>Sign in to see your saved experiences</h2>
            <p>Sign in with your traveler account to view and manage your saved experiences.</p>
            <button type="button" class="outline-control workflow-primary" (click)="openAuthModal()">
              Sign in
            </button>
          </div>
        } @else {
          @if (wishlist.error()) {
            <div class="workflow-state" role="alert">
              <p>{{ wishlist.error() }}</p>
              @if (!wishlist.ready()) {
                <button type="button" class="outline-control" (click)="wishlist.ensure()">
                  Retry saved status
                </button>
              }
            </div>
          }

          @if (state(); as result) {
            @if (result.status === 'loading') {
              <p class="workflow-state" role="status">Loading saved experiences…</p>
            } @else if (result.status === 'error') {
              <div class="workflow-state" role="alert">
                <p>Could not load saved experiences.</p>
                <button type="button" class="outline-control" (click)="retry()">Retry</button>
              </div>
            } @else if (result.status === 'ready' && result.owner === session.account()) {
              <div class="results-meta-bar" style="margin-bottom: 1.5rem;">
                <div class="count-pill">
                  <span class="pill-badge">{{ result.data.items.length }}{{ result.data.next_offset !== null ? '+' : '' }}</span>
                  <span class="pill-text" aria-live="polite">
                    {{ result.data.items.length }} saved on page {{ page() }}
                  </span>
                </div>
              </div>

              @if (!result.data.items.length) {
                <div class="workflow-card empty-wishlist-card">
                  <app-experience-icon name="heart" class="empty-icon" />
                  <h3>No saved experiences yet.</h3>
                  <p>Explore activities and click the heart icon on any card to save it for later.</p>
                  <a routerLink="/experiences" class="outline-control workflow-primary" style="margin-top: 1rem;">
                    Explore Experiences
                  </a>
                </div>
              } @else {
                <div class="experience-grid">
                  @for (item of result.data.items; track item.id) {
                    <app-experience-card
                      [experience]="mapCard(item)"
                      [detailLink]="true"
                      [liveFavorite]="true"
                    />
                  }
                </div>

                <div class="wishlist-pagination-wrap">
                  <app-experience-pagination
                    [page]="page()"
                    [hasNext]="result.data.next_offset !== null"
                    (change)="changePage($event, result.data.next_offset)"
                  />
                </div>
              }
            }
          }
        }
      </main>
    </div>
  `,
})
export class SavedExperiences {
  readonly wishlist = inject(WishlistState);
  readonly session = inject(TravelSession);
  private readonly api = inject(TRAVEL_SOURCE);
  private readonly authModal = inject(AuthModalService);

  readonly pageSize = 8;
  readonly page = signal(1);
  readonly offset = signal(0);
  readonly offsetHistory = signal<number[]>([0]);
  private readonly refresh = signal(0);
  readonly mapCard = toActivityCard;

  private readonly request = computed(() => ({
    owner: this.session.account(),
    offset: this.offset(),
    revision: this.wishlist.revision(),
    refresh: this.refresh(),
  }));

  readonly state = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ owner, offset }) => {
        if (!owner) return of({ status: 'idle' } as const);
        this.wishlist.ensure();
        return loadState(this.api.saved(this.pageSize, offset)).pipe(
          map((state) => (state.status === 'ready' ? { ...state, owner } : state)),
        );
      }),
    ),
  );

  changePage(nextPage: number, nextOffset: number | null): void {
    if (nextPage === this.page() || nextPage < 1) return;
    if (nextPage > this.page()) {
      if (nextOffset == null) return;
      this.offsetHistory.update((history) => [...history, nextOffset]);
      this.offset.set(nextOffset);
      this.page.set(nextPage);
    } else {
      const history = this.offsetHistory();
      const targetOffset = history[nextPage - 1] ?? 0;
      this.offsetHistory.set(history.slice(0, nextPage));
      this.offset.set(targetOffset);
      this.page.set(nextPage);
    }
  }

  openAuthModal(): void {
    this.authModal.open('login', undefined, {
      type: 'wishlist',
      resumeCallback: () => this.retry(),
    });
  }

  retry(): void {
    this.refresh.update((value) => value + 1);
  }
}
