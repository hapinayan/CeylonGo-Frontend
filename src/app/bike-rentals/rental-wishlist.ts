import { ChangeDetectionStrategy, Component, DestroyRef, Injectable, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { AuthModalService } from '../core/services/auth-modal.service';
import { AuthService } from '../core/services/auth.service';
import { RentalApi } from './rental-api';

@Injectable({ providedIn: 'root' })
class RentalPreviewWishlist {
  readonly ids = signal<ReadonlySet<number>>(new Set());

  toggle(id: number): void {
    this.ids.update(saved => {
      const updated = new Set(saved);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }
}

@Component({
  selector: 'app-rental-wishlist',
  template: `
    <button type="button" [disabled]="busy() || remote().loading"
      [attr.aria-label]="saved() ? 'Remove from rental wishlist' : 'Save to rental wishlist'"
      [attr.aria-pressed]="saved()" (click)="toggle($event)">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
        <path d="M20.8 8.7c0 4.7-8.8 9.7-8.8 9.7S3.2 13.4 3.2 8.7a4.5 4.5 0 0 1 8.8-1.4 4.5 4.5 0 0 1 8.8 1.4Z"/>
      </svg>
    </button>
    @if (message() || remote().error) {
      <span class="notice" role="status">{{ message() || remote().error }}</span>
    }
  `,
  styles: `
    :host { display: inline-grid; justify-items: end; position: relative; }
    button { border: 1px solid #d8e8f8; border-radius: 50%; background: #fff; color: #174dae;
      width: 44px; height: 44px; display: grid; place-items: center; cursor: pointer;
      box-shadow: 0 2px 8px #082b5c26; }
    svg { width: 22px; height: 22px; }
    button:hover { background: #eff6ff; }
    button[aria-pressed=true] { color: #1d56ca; background: #eff6ff; }
    button[aria-pressed=true] svg { fill: currentColor; }
    button:disabled { cursor: wait; }
    button:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
    .notice { position: absolute; z-index: 1; top: calc(100% + 4px); right: 0; width: 12rem; padding: .5rem;
      background: white; color: #082b5c; border: 1px solid #d8e8f8; border-radius: .5rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalWishlist {
  private readonly api = inject(RentalApi);
  private readonly auth = inject(AuthService);
  private readonly modal = inject(AuthModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly previewWishlist = inject(RentalPreviewWishlist);
  readonly id = input.required<number>();
  readonly preview = input(false);
  readonly busy = signal(false);
  readonly message = signal('');
  private readonly refresh = signal(0);
  private readonly target = computed(() => ({ id: this.id(), user: this.auth.currentUser(), preview: this.preview(), refresh: this.refresh() }));
  readonly remote = toSignal(toObservable(this.target).pipe(switchMap(({ id, user, preview }) =>
    user && !preview && this.auth.isAuthenticated()
      ? this.api.saved(id).pipe(
          map(result => ({ ...result, loading: false, error: '' })),
          startWith({ saved: false, loading: true, error: '' }),
          catchError(error => of({ saved: false, loading: false, error: this.failureMessage(error.status,
            'Wishlist status unavailable. Activate the wishlist button to retry.') })),
        )
      : of({ saved: false, loading: false, error: '' }),
  )), { initialValue: { saved: false, loading: false, error: '' } });
  readonly saved = computed(() => this.preview() ? this.previewWishlist.ids().has(this.id()) : !!this.auth.currentUser() && this.remote().saved);

  toggle(event: Event): void {
    this.message.set('');
    if (this.preview()) {
      this.previewWishlist.toggle(this.id());
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.modal.open('login', event.currentTarget as HTMLElement);
      return;
    }
    if (!this.auth.currentUser()) {
      this.message.set('Your traveler session is still loading.');
      return;
    }
    if (this.remote().error) {
      this.refresh.update(value => value + 1);
      return;
    }
    this.busy.set(true);
    const removing = this.saved();
    this.api.toggleSaved(this.id(), removing).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.refresh.update(value => value + 1); this.busy.set(false); },
      error: error => {
        if (!removing && error.status === 409) {
          this.refresh.update(value => value + 1);
        } else {
          this.message.set(this.failureMessage(error.status, 'Could not update your wishlist. Try again.'));
        }
        this.busy.set(false);
      },
    });
  }

  private failureMessage(status: number, fallback: string): string {
    switch (status) {
      case 401: return 'Your session is no longer authorized. Sign in again to use your wishlist.';
      case 403: return 'Your account does not have permission to use the rental wishlist.';
      case 404: return 'This rental is no longer available to save.';
      default: return fallback;
    }
  }
}
