import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { ExperienceCard } from '../../components/experience-card';
import { ExperienceIcon } from '../../components/icon';
import { Pagination } from '../../components/pagination';
import { TravelerHeader } from '../../components/traveler-header';
import { Footer } from '../../../shared/components/footer/footer';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { toExperience } from '../../services/eco-api';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { WishlistState } from '../../services/wishlist-state';
import { loadState } from '../../services/workflow-state';

@Component({
  imports: [TravelerHeader, RouterLink, ExperienceCard, Pagination, ExperienceIcon, Footer],
  styleUrls: ['../discover/discover.scss', './traveler.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="experiences-shell">
      <app-traveler-header />
      <main class="discover traveler-workflow">
        <a routerLink="/experiences" class="workflow-back-link">
          <app-experience-icon name="previous" /> Back to Discover
        </a>

        <div class="workflow-page-header">
          <div class="header-title-wrap">
            <h1>Saved Experiences</h1>
            <p class="workflow-lead-p">Keep track of your favorite activities and outdoor tours in Sri Lanka.</p>
          </div>
        </div>

        @if (catalog.preview) {
          <p role="status" class="workflow-note">Development preview · Favorites are temporary.</p>
          @if (samples().length) {
            <div class="results-meta-bar" style="margin-bottom: 1.5rem;">
              <div class="count-pill">
                <span class="pill-badge">{{ samples().length }}</span>
                <span class="pill-text" aria-live="polite">{{ samples().length }} saved</span>
              </div>
            </div>
            <div class="experience-grid">
              @for (card of samples(); track card.id) {
                <app-experience-card [experience]="card" [favorite]="true" [preview]="true" [detailLink]="true"
                  (toggleFavorite)="wishlist.togglePreview(card.id)" />
              }
            </div>
          } @else {
            <div class="workflow-card empty-wishlist-card">
              <app-experience-icon name="heart" class="empty-icon" />
              <h3>No saved experiences yet.</h3>
              <p>Explore experiences and click the heart icon on any card to save it for later.</p>
              <a routerLink="/experiences" class="outline-control workflow-primary" style="margin-top: 1rem;">Explore Experiences</a>
            </div>
          }
        } @else if (!session.account()) {
          <div class="workflow-card signin-prompt">
            <h2>Sign in to see your saved experiences</h2>
            <p>Sign in to view and synchronize your saved outdoor activities across devices.</p>
            <a class="outline-control workflow-primary" routerLink="/auth">Sign in</a>
          </div>
        } @else {
          <div class="wishlist-toolbar">
            <label class="filter-checkbox">
              <input type="checkbox" #available [checked]="only()" (change)="filter(available.checked)">
              <span>Available only</span>
            </label>
          </div>

          @if (wishlist.error()) {
            <div class="workflow-state" role="alert">
              <p>{{ wishlist.error() }}</p>
              @if (!wishlist.ready()) {
                <button class="outline-control" (click)="wishlist.ensure()">Retry saved status</button>
              }
            </div>
          }

          @if (state(); as result) {
            @if (result.status === 'loading') {
              <p class="workflow-state" role="status">Loading saved experiences…</p>
            }
            @if (result.status === 'error') {
              <div class="workflow-state" role="alert">
                <p>Could not load saved experiences.</p>
                <button class="outline-control" (click)="retry()">Retry</button>
              </div>
            }
            @if (result.status === 'ready' && result.owner === session.account()) {
              <div class="results-meta-bar" style="margin-bottom: 1.5rem;">
                <div class="count-pill">
                  <span class="pill-badge">{{ result.data.total }}</span>
                  <span class="pill-text" aria-live="polite">{{ result.data.total }} saved</span>
                </div>
              </div>

              @if (!result.data.items.length) {
                <div class="workflow-card empty-wishlist-card">
                  <app-experience-icon name="heart" class="empty-icon" />
                  <h3>No saved experiences on this page.</h3>
                  <p>Browse our catalog of nature, adventure, and local culture activities.</p>
                  <a routerLink="/experiences" class="outline-control workflow-primary" style="margin-top: 1rem;">Explore Experiences</a>
                </div>
              } @else {
                <div class="experience-grid">
                  @for (item of result.data.items; track item.id) {
                    @if (item.experience && item.is_available) {
                      <app-experience-card [experience]="mapCard(item.experience)" [favorite]="true" [detailLink]="true" [liveFavorite]="true" />
                    } @else {
                      <article class="workflow-state unavailable-card">
                        <h2>Experience unavailable</h2>
                        <p>This experience is currently unavailable or has been deactivated by the host.</p>
                        <button type="button" class="outline-control" [disabled]="!wishlist.ready() || wishlist.busy(item.eco_experience_id)"
                          (click)="wishlist.remove(item.eco_experience_id)">
                          Remove from saved
                        </button>
                      </article>
                    }
                  }
                </div>

                <div class="wishlist-pagination-wrap">
                  <app-experience-pagination [page]="page()" [totalPages]="result.data.total_pages" (change)="page.set($event)" />
                  @if (page() > 1 && page() > result.data.total_pages) {
                    <button class="outline-control" (click)="page.set(page() - 1)">Previous page</button>
                  }
                </div>
              }
            }
          }
        }
      </main>
      <app-footer />
    </div>
  `,
})
export class SavedExperiences {
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly wishlist = inject(WishlistState);
  readonly session = inject(TravelSession);
  private readonly api = inject(TRAVEL_SOURCE);
  readonly page = signal(1);
  readonly only = signal(false);
  private readonly refresh = signal(0);
  readonly mapCard = toExperience;
  readonly samples = computed(() => this.catalog.experiences.filter(item => this.wishlist.previewIds().has(item.id)));
  private readonly request = computed(() => ({
    owner: this.session.account(), page: this.page(), only: this.only(), revision: this.wishlist.revision(), refresh: this.refresh(),
  }));
  readonly state = toSignal(toObservable(this.request).pipe(switchMap(({owner, page, only}) => {
    if (!owner || this.catalog.preview) return of({status: 'idle'} as const);
    this.wishlist.ensure();
    return loadState(this.api.saved(page, 8, only)).pipe(
      map(state => state.status === 'ready' ? {...state, owner} : state),
    );
  })));

  filter(value: boolean): void { this.only.set(value); this.page.set(1); }
  retry(): void { this.refresh.update(value => value + 1); }
}
