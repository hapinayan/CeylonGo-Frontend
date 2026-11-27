import { DecimalPipe, ViewportScroller } from '@angular/common';
import { Component, DestroyRef, ElementRef, Injectable, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, filter, map, of, startWith, switchMap, takeUntil, tap } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { ExperienceIcon } from '../experiences/components/icon';
import { TravelSession } from '../experiences/services/travel-session';
import { WishlistState } from '../experiences/services/wishlist-state';
import { AccountEmptyStateComponent } from '../shared/account/account-empty-state.component';
import { AccountLoadingSkeletonComponent } from '../shared/account/account-loading-skeleton.component';
import { AccountPageHeaderComponent } from '../shared/account/account-page-header.component';
import { TravelerAccountLayoutComponent } from '../shared/account/traveler-account-layout.component';
import { TravelerWishlistApi } from './wishlist-api';
import { SavedListing, WishlistKind, displayListings, listingKey, wishlistKinds, wishlistLabels } from './wishlist-model';
import { wishlistExamples, wishlistPreviewEnabled } from './wishlist-preview';

const PREVIEW = Symbol('wishlist preview');
type Account = ReturnType<TravelSession['account']>;
type Section = { kind: WishlistKind; state: 'loading' | 'error' | 'ready'; items: SavedListing[] };

@Injectable()
export class WishlistNavigation {
  returnTo?: { url: string; y: number; owner: Account | typeof PREVIEW };
  readonly hiddenSamples = signal(new Set<string>());
}

@Component({
  selector: 'app-traveler-wishlist',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    ExperienceIcon,
    TravelerAccountLayoutComponent,
    AccountPageHeaderComponent,
    AccountEmptyStateComponent,
    AccountLoadingSkeletonComponent,
  ],
  templateUrl: './traveler-wishlist.html',
  styleUrl: './traveler-wishlist.scss',
})
export class TravelerWishlist {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly viewport = inject(ViewportScroller);
  private readonly auth = inject(AuthService);
  private readonly travelSession = inject(TravelSession);
  private readonly navigation = inject(WishlistNavigation);
  private readonly api = inject(TravelerWishlistApi);
  private readonly ecoState = inject(WishlistState);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchField');
  private readonly reload = new Subject<WishlistKind>();
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly preview = computed(() => wishlistPreviewEnabled && this.query().get('preview') === '1');
  readonly owner = computed(() => (this.preview() ? PREVIEW : this.travelSession.account()));
  readonly account = computed(() => (this.owner() && !this.preview() ? this.auth.currentUser() : null));
  readonly category = computed(() => this.query().get('category') || 'all');
  readonly search = computed(() => (this.query().get('q') || '').slice(0, 120));
  readonly sort = computed(() => this.query().get('sort') || 'recent');
  readonly kinds = wishlistKinds;
  readonly labels = wishlistLabels;
  readonly icons: Record<WishlistKind, string> = {
    homestay: 'home',
    eco: 'leaf',
    guide: 'group',
    rental: 'bicycle',
    artisan: 'culture',
  };
  readonly key = listingKey;
  readonly samples = wishlistExamples;

  private readonly ownerChanges = toObservable(this.owner);
  private readonly mutations = signal(new Map<string, { owner: Account; busy: boolean }>());

  private readonly result = toSignal(
    this.ownerChanges.pipe(
      switchMap((owner) =>
        !owner || owner === PREVIEW
          ? of({ owner, sections: [] as Section[] })
          : combineLatest(
              wishlistKinds.map((kind) =>
                this.reload.pipe(
                  startWith(kind),
                  filter((requested) => requested === kind),
                  switchMap(() =>
                    this.api.list(kind).pipe(
                      map((items) => ({ kind, state: 'ready', items }) as Section),
                      catchError(() => of<Section>({ kind, state: 'error', items: [] })),
                      startWith<Section>({ kind, state: 'loading', items: [] }),
                    ),
                  ),
                ),
              ),
            ).pipe(map((sections) => ({ owner, sections }))),
      ),
    ),
  );

  readonly sections = computed(() => {
    const result = this.result();
    return result?.owner === this.owner() ? result.sections : [];
  });

  readonly loading = computed(
    () =>
      (!this.preview() && this.sections().length !== wishlistKinds.length) ||
      this.sections().some((section) => section.state === 'loading'),
  );

  readonly items = computed(() =>
    this.preview()
      ? wishlistExamples.filter((item) => !this.navigation.hiddenSamples().has(listingKey(item)))
      : this.sections().flatMap((section) => section.items),
  );

  readonly count = computed(() => new Set(this.items().map(listingKey)).size);
  readonly visible = computed(() => displayListings(this.items(), this.category(), this.search(), this.sort()));
  readonly missingSamples = computed(() =>
    this.samples.filter((item) => this.navigation.hiddenSamples().has(listingKey(item))),
  );
  readonly hasActiveFilters = computed(() => this.category() !== 'all' || Boolean(this.search().trim()));

  constructor() {
    this.ownerChanges
      .pipe(
        tap(() => this.mutations.set(new Map())),
        takeUntilDestroyed(),
      )
      .subscribe();

    toObservable(this.loading)
      .pipe(takeUntilDestroyed())
      .subscribe((loading) => {
        if (loading) return;
        const position = this.navigation.returnTo;
        this.navigation.returnTo = undefined;
        if (position?.owner === this.owner() && position?.url === this.router.url) {
          requestAnimationFrame(() => {
            if (position.owner === this.owner() && position.url === this.router.url) {
              this.viewport.scrollToPosition([0, position.y]);
            }
          });
        }
      });
  }

  focusSearch(): void {
    this.searchField()?.nativeElement.focus();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }

  retry(kind: WishlistKind): void {
    this.reload.next(kind);
  }

  remember(): void {
    const owner = this.owner();
    if (owner) {
      this.navigation.returnTo = { owner, url: this.router.url, y: this.viewport.getScrollPosition()[1] };
    }
  }

  updateQuery(key: string, value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { [key]: value === 'all' ? null : value.trim().slice(0, 120) || null },
    });
  }

  clearFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { category: null, q: null },
    });
  }

  mutation(item: SavedListing) {
    const state = this.mutations().get(this.key(item));
    return state?.owner === this.owner() ? state : undefined;
  }

  remove(item: SavedListing): void {
    const owner = this.owner();
    const key = this.key(item);
    if (owner === PREVIEW) {
      this.setSample(item, false);
      return;
    }
    if (!owner || this.mutation(item)?.busy) return;
    this.setMutation(key, { owner, busy: true });
    this.api
      .remove(item)
      .pipe(
        takeUntil(this.ownerChanges.pipe(filter((next) => next !== owner))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          if (this.owner() !== owner) return;
          if (item.kind === 'eco') this.ecoState.reconcileRemoval(item.id);
          this.setMutation(key);
          this.retry(item.kind);
        },
        error: () => {
          if (this.owner() === owner) {
            this.setMutation(key, { owner, busy: false });
          }
        },
      });
  }

  setSample(item: SavedListing, save: boolean): void {
    if (!this.preview()) return;
    const key = this.key(item);
    this.navigation.hiddenSamples.update((items) => {
      const next = new Set(items);
      if (save) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  private setMutation(key: string, state?: { owner: Account; busy: boolean }): void {
    this.mutations.update((states) => {
      const next = new Map(states);
      if (state) next.set(key, state);
      else next.delete(key);
      return next;
    });
  }
}
