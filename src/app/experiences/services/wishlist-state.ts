import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, expand, filter, Observable, reduce, Subscription } from 'rxjs';
import { TravelSession } from './travel-session';
import { TRAVEL_SOURCE } from './travel-api';
import { extractApiErrorMessage } from './activities-api';

@Injectable({ providedIn: 'root' })
export class WishlistState {
  private readonly api = inject(TRAVEL_SOURCE);
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
    this.requests.add(
      this.api
        .saved(100, 0)
        .pipe(
          expand((page) =>
            page.next_offset != null ? this.api.saved(100, page.next_offset) : EMPTY,
          ),
          reduce(
            (ids, page) => [...ids, ...page.items.map((item) => item.id)],
            [] as number[],
          ),
          filter(() => this.session.account() === account),
        )
        .subscribe({
          next: (ids) => {
            this.entries.set(new Set(ids));
            this.loaded.set(true);
            this.loading = false;
          },
          error: (err: HttpErrorResponse) => {
            if (this.session.account() !== account) return;
            this.loading = false;
            this.error.set(extractApiErrorMessage(err, 'Could not load saved experiences.'));
          },
        }),
    );
  }

  ready(): boolean {
    return this.session.account() === this.owner && this.loaded();
  }

  busy(id: number): boolean {
    return this.session.account() === this.owner && this.pending().has(id);
  }

  togglePreview(id: string): void {
    this.previewIds.update((ids) => this.withValue(ids, id, !ids.has(id)));
  }

  toggle(id: number): void {
    this.setSaved(id, !this.entries().has(id));
  }

  save(id: number): void {
    this.setSaved(id, true);
  }

  remove(id: number): void {
    this.setSaved(id, false);
  }

  private setSaved(id: number, saved: boolean): void {
    const account = this.session.account();
    if (!account || this.pending().has(id)) return;
    const previous = this.entries().has(id);
    this.error.set('');
    this.pending.update((ids) => this.withValue(ids, id, true));
    this.entries.update((ids) => this.withValue(ids, id, saved));
    const request: Observable<unknown> = saved ? this.api.save(id) : this.api.unsave(id);
    this.requests.add(
      request.subscribe({
        next: () => this.finish(account, id, true, previous),
        error: (error: HttpErrorResponse) =>
          this.finish(account, id, !saved && error.status === 404, previous, error),
      }),
    );
  }

  private finish(
    account: ReturnType<TravelSession['account']>,
    id: number,
    success: boolean,
    previous: boolean,
    error?: HttpErrorResponse,
  ): void {
    if (!account || this.session.account() !== account) return;
    this.pending.update((ids) => this.withValue(ids, id, false));
    if (success) {
      this.loaded.set(true);
      this.generation.update((value) => value + 1);
    } else {
      this.entries.update((ids) => this.withValue(ids, id, previous));
      this.error.set(
        extractApiErrorMessage(error, 'Could not update your saved experiences. Try again.'),
      );
    }
  }

  private withValue<T>(values: Set<T>, value: T, include: boolean): Set<T> {
    const result = new Set(values);
    if (include) result.add(value);
    else result.delete(value);
    return result;
  }
}
