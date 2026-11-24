import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { BookingPanel } from '../../components/booking-panel';
import { TravelerHeader } from '../../components/traveler-header';
import { EXPERIENCE_CATALOG } from '../../services/catalog';
import { BOOKABLE_PREVIEW } from '../../services/travel-api';
import { EcoApi } from '../../services/eco-api';
import { loadState, positiveId } from '../../services/workflow-state';

@Component({
  imports: [TravelerHeader, RouterLink, BookingPanel],
  styleUrls: ['../discover/discover.scss', './traveler.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="experiences-shell"><app-traveler-header />
      <main class="discover traveler-workflow">
        <a routerLink="/experiences">Back to Discover</a>
        @if (state(); as result) {
          @if (result.status === 'loading') { <p class="workflow-state" role="status">Loading booking information…</p> }
          @if (result.status === 'error') {
            <h1>Booking unavailable</h1>
            @if (result.code !== 404) { <button class="outline-control" (click)="refresh.update(next)">Retry</button> }
          }
          @if (result.status === 'ready') {
            <a [routerLink]="['/experiences', result.id]">Back to experience</a>
            <h1>{{ result.data.title }}</h1>
            <p>{{ result.data.city }} · {{ result.data.currency }} {{ result.data.base_price }} / {{ result.data.pricing_type === 'per_group' ? 'group' : 'person' }}</p>
            <app-experience-booking [listing]="result.data" [routeId]="result.id" [reviewMode]="true" />
          }
        }
      </main>
    </div>
  `,
})
export class BookingCreate {
  private readonly route = inject(ActivatedRoute);
  private readonly eco = inject(EcoApi);
  private readonly sample = inject(BOOKABLE_PREVIEW);
  private readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly refresh = signal(0);
  readonly next = (value: number) => value + 1;
  readonly state = toSignal(combineLatest([
    this.route.paramMap.pipe(map(params => params.get('id') ?? '')), toObservable(this.refresh),
  ]).pipe(switchMap(([id]) => {
    if (this.catalog.preview) {
      const listing = this.sample(id);
      return of(listing ? {status: 'ready', data: listing, id} as const : {status: 'error', code: 404} as const);
    }
    const key = positiveId(id);
    if (!key) return of({status: 'error', code: 404} as const);
    return loadState(this.eco.detail(key)).pipe(map(result => result.status === 'ready' ? {...result, id} : result));
  })));
}
