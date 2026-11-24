import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { ExperienceCard } from '../../components/experience-card';
import { Pagination } from '../../components/pagination';
import { TravelerHeader } from '../../components/traveler-header';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { toExperience } from '../../services/eco-api';
import { TRAVEL_SOURCE } from '../../services/travel-api';
import { TravelSession } from '../../services/travel-session';
import { WishlistState } from '../../services/wishlist-state';
import { loadState } from '../../services/workflow-state';

@Component({
  imports: [TravelerHeader, RouterLink, ExperienceCard, Pagination],
  styleUrls: ['../discover/discover.scss', './traveler.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="experiences-shell"><app-traveler-header />
      <main class="discover traveler-workflow">
        <a routerLink="/experiences">Back to Discover</a>
        <h1>Saved Experiences</h1>
        @if (catalog.preview) {
          <p role="status">Development preview · Favorites are temporary.</p>
          @if (samples().length) {
            <p>{{ samples().length }} saved</p>
            <div class="experience-grid">
              @for (card of samples(); track card.id) {
                <app-experience-card [experience]="card" [favorite]="true" [preview]="true" [detailLink]="true"
                  (toggleFavorite)="wishlist.togglePreview(card.id)" />
              }
            </div>
          } @else { <p>No saved experiences yet.</p> }
        } @else if (!session.account()) {
          <p>Sign in to see your saved experiences.</p><a class="outline-control" routerLink="/auth">Sign in</a>
        } @else {
          <label><input type="checkbox" #available [checked]="only()" (change)="filter(available.checked)"> Available only</label>
          @if (wishlist.error()) {
            <p role="alert">{{ wishlist.error() }}</p>
            @if (!wishlist.ready()) { <button class="outline-control" (click)="wishlist.ensure()">Retry saved status</button> }
          }
          @if (state(); as result) {
            @if (result.status === 'loading') { <p class="workflow-state" role="status">Loading saved experiences…</p> }
            @if (result.status === 'error') {
              <div role="alert"><p>Could not load saved experiences.</p><button class="outline-control" (click)="retry()">Retry</button></div>
            }
            @if (result.status === 'ready' && result.owner === session.account()) {
              <p aria-live="polite">{{ result.data.total }} saved</p>
              @if (!result.data.items.length) { <p>No saved experiences on this page.</p> }
              <div class="experience-grid">
                @for (item of result.data.items; track item.id) {
                  @if (item.experience && item.is_available) {
                    <app-experience-card [experience]="mapCard(item.experience)" [favorite]="true" [detailLink]="true" [liveFavorite]="true" />
                  } @else {
                    <article class="workflow-state"><h2>Experience unavailable</h2>
                      <button type="button" class="outline-control" [disabled]="!wishlist.ready() || wishlist.busy(item.eco_experience_id)"
                        (click)="wishlist.remove(item.eco_experience_id)">Remove from saved</button>
                    </article>
                  }
                }
              </div>
              <app-experience-pagination [page]="page()" [totalPages]="result.data.total_pages" (change)="page.set($event)" />
              @if (page() > 1 && page() > result.data.total_pages) {
                <button class="outline-control" (click)="page.set(page() - 1)">Previous page</button>
              }
            }
          }
        }
      </main>
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
