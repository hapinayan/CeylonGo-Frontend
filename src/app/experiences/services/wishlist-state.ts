import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, expand, filter, Observable, reduce, Subscription } from 'rxjs';
import { TravelSession } from './travel-session';
import { TravelApi } from './travel-api';

@Injectable({providedIn: 'root'})
export class WishlistState {
  private readonly api = inject(TravelApi);
  private readonly session = inject(TravelSession);
  private owner = this.session.account();
  private readonly entries = signal(new Set<number>());
  private readonly pending = signal(new Set<number>());
  private readonly loaded = signal(false);
  private readonly generation = signal(0);
  readonly revision = this.generation.asReadonly();
  readonly error = signal('');
  private requests = new Subscription();
  private loading = false;

  readonly previewIds = signal(new Set<string>());
  readonly saved = computed(() => {
    const entries = this.entries();
    return this.session.account() === this.owner ? entries : new Set<number>();
  });

  constructor() {
    effect(() => {
      const account = this.session.account();
      untracked(() => {
        if (account !== this.owner) this.switchAccount(account);
      });
    });
  }

  private switchAccount(account: ReturnType<TravelSession['account']>): void {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.owner = account;
    this.entries.set(new Set());
    this.pending.set(new Set());
    this.loaded.set(false);
    this.error.set('');
    this.loading = false;
  }

  ensure(): void {
    const account = this.session.account();
    if (account !== this.owner) this.switchAccount(account);
    if (!account || this.loaded() || this.loading) return;
    this.loading = true;
    this.error.set('');
    this.requests.add(this.api.saved(1, 100).pipe(
      expand(page => page.page < page.total_pages ? this.api.saved(page.page + 1, 100) : EMPTY),
      reduce((ids, page) => [...ids, ...page.items.map(item => item.eco_experience_id)], [] as number[]),
      filter(() => this.session.account() === account),
    ).subscribe({
      next: ids => { this.entries.set(new Set(ids)); this.loaded.set(true); this.loading = false; },
      error: () => {
        if (this.session.account() !== account) return;
        this.loading = false;
        this.error.set('Could not load saved experiences.');
      },
    }));
  }

  ready(): boolean { return this.session.account() === this.owner && this.loaded(); }
  busy(id: number): boolean { return this.session.account() === this.owner && this.pending().has(id); }
  togglePreview(id: string): void { this.previewIds.update(ids => this.withValue(ids, id, !ids.has(id))); }

  toggle(id: number): void { this.setSaved(id, !this.entries().has(id)); }

  remove(id: number): void { this.setSaved(id, false); }

  reconcileRemoval(id: number): void {
    if (this.session.account() !== this.owner) return;
    this.entries.update(ids => this.withValue(ids, id, false));
    this.generation.update(value => value + 1);
  }

  private setSaved(id: number, saved: boolean): void {
    const account = this.session.account();
    if (!account || !this.ready() || this.pending().has(id)) return;
    const previous = this.entries().has(id);
    this.error.set('');
    this.pending.update(ids => this.withValue(ids, id, true));
    this.entries.update(ids => this.withValue(ids, id, saved));
    const request: Observable<unknown> = saved ? this.api.save(id) : this.api.unsave(id);
    this.requests.add(request.subscribe({
      next: () => this.finish(account, id, true, previous),
      error: (error: HttpErrorResponse) => this.finish(account, id,
        !saved ? error.status === 404 : error.status === 409 &&
          error.error?.detail === 'Eco experience is already in your wishlist',
        previous),
    }));
  }

  private finish(account: ReturnType<TravelSession['account']>, id: number, success: boolean, previous: boolean): void {
    if (!account || this.session.account() !== account) return;
    this.pending.update(ids => this.withValue(ids, id, false));
    if (success) this.generation.update(value => value + 1);
    else {
      this.entries.update(ids => this.withValue(ids, id, previous));
      this.error.set('Could not update your saved experiences. Try again.');
    }
  }

  private withValue<T>(values: Set<T>, value: T, include: boolean): Set<T> {
    const result = new Set(values);
    if (include) result.add(value);
    else result.delete(value);
    return result;
  }
}
