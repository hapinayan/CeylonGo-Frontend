import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, defer, filter, finalize, map, of, startWith, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { TravelSession } from '../experiences/services/travel-session';
import { TravelerWishlistApi } from './wishlist-api';

type Owner = NonNullable<ReturnType<TravelSession['account']>>;

@Injectable({ providedIn: 'root' })
export class HomestayWishlistState {
  private readonly api = inject(TravelerWishlistApi);
  private readonly session = inject(TravelSession);
  private readonly owners = toObservable(this.session.account);
  private readonly revision = signal(0);
  private readonly request = computed(() => ({ owner: this.session.account(), revision: this.revision() + this.api.homestayRevision() }));
  private readonly pending = new Map<Owner, Set<number>>();
  private readonly result = toSignal(toObservable(this.request).pipe(switchMap(({ owner }) =>
    owner ? this.api.list('homestay').pipe(
      map(items => ({ owner, ids: items.map(item => item.id), ready: true, error: false })),
      startWith({ owner, ids: [] as number[], ready: false, error: false }),
      catchError(() => of({ owner, ids: [] as number[], ready: false, error: true })),
    ) : of(null),
  )));

  private readonly current = computed(() => {
    const result = this.result();
    return result?.owner === this.session.account() ? result : null;
  });
  readonly ids = computed(() => this.current()?.ids ?? []);
  readonly active = this.session.account;

  change(id: number, desired?: boolean): Observable<boolean> {
    return defer(() => {
      const owner = this.active();
      const current = this.current();
      if (!owner) return throwError(() => new Error('An active traveler is required.'));
      if (desired === undefined && !current?.ready) {
        if (current?.error) this.revision.update(value => value + 1);
        return throwError(() => new Error('Saved homestays are unavailable. Try again shortly.'));
      }
      const pending = this.pending.get(owner) ?? new Set<number>();
      if (pending.has(id)) return throwError(() => new Error('A wishlist change is already pending.'));
      const saved = desired ?? !this.ids().includes(id);
      pending.add(id);
      this.pending.set(owner, pending);
      return this.api.setHomestay(id, saved).pipe(
        takeUntil(this.owners.pipe(filter(next => next !== owner))),
        tap({ error: () => this.refresh(owner) }),
        map(() => saved),
        finalize(() => {
          pending.delete(id);
          if (!pending.size) this.pending.delete(owner);
        }),
      );
    });
  }

  private refresh(owner: Owner): void {
    if (this.active() === owner) this.revision.update(value => value + 1);
  }
}
