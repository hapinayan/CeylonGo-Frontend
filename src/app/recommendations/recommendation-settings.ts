import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { AccountConfirmDialogComponent } from '../shared/account/account-confirm-dialog.component';
import { RecommendationService } from './recommendation.service';

@Component({
  selector: 'app-recommendation-settings',
  imports: [AccountConfirmDialogComponent],
  template: `
    <section aria-labelledby="recommendation-preferences">
      <h2 id="recommendation-preferences">Recommendation Preferences</h2>
      <p>
        Allow CeylonGo to use your searches, viewed services, wishlist activity, and booking history
        to improve your recommendations.
      </p>
      @if (loaded()) {
        <label>
          <input
            type="checkbox"
            [checked]="enabled()"
            [disabled]="busy()"
            (change)="save($any($event.target).checked)"
          />
          Personalized Recommendations
        </label>
        <button type="button" [disabled]="busy()" (click)="confirming.set(true)">
          Clear Recommendation History
        </button>
      } @else if (busy()) {
        <p role="status">Loading recommendation settings…</p>
      } @else {
        <button type="button" (click)="load()">Retry loading settings</button>
      }
      @if (message()) {
        <p [attr.role]="failed() ? 'alert' : 'status'">{{ message() }}</p>
      }
    </section>
    @if (confirming()) {
      <app-account-confirm-dialog
        title="Clear recommendation history?"
        message="This clears recommendation searches and views. Your bookings, wishlist items, and account information are kept."
        [open]="true"
        [destructive]="true"
        confirmLabel="Clear history"
        (confirmed)="clear()"
        (cancelled)="confirming.set(false)"
      />
    }
  `,
  styles: `
    section {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem;
      margin: 0 0 1.25rem;
      color: #142747;
    }
    h2 {
      margin: 0;
      font-size: 1.18rem;
    }
    p {
      color: #475569;
    }
    label {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 1rem 0;
    }
    input {
      accent-color: #155ac6;
    }
    button {
      border: 1px solid #aac4e8;
      border-radius: 8px;
      padding: 0.65rem 1rem;
      color: #155ac6;
      background: white;
    }
  `,
})
export class RecommendationSettings {
  private readonly api = inject(RecommendationService);
  private readonly destroy = inject(DestroyRef);
  readonly busy = signal(false);
  readonly loaded = signal(false);
  readonly enabled = signal(false);
  readonly confirming = signal(false);
  readonly message = signal('');
  readonly failed = signal(false);
  constructor() {
    effect(() => {
      const session = this.api.session();
      this.loaded.set(false);
      this.enabled.set(false);
      this.confirming.set(false);
      this.busy.set(false);
      this.message.set('');
      if (session) this.load();
    });
  }
  load() {
    const session = this.api.session();
    this.busy.set(true);
    this.message.set('');
    this.api
      .getSettings()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (this.api.session() === session) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (settings) => {
          if (this.api.session() !== session) return;
          this.enabled.set(settings.behavioral_personalization);
          this.loaded.set(true);
        },
        error: () => {
          if (this.api.session() !== session) return;
          this.failed.set(true);
          this.message.set('Could not load recommendation settings.');
        },
      });
  }
  save(enabled: boolean) {
    this.change(enabled);
  }
  clear() {
    this.confirming.set(false);
    this.change();
  }
  private change(enabled?: boolean) {
    const session = this.api.session();
    const request: Observable<unknown> =
      enabled === undefined ? this.api.clearHistory() : this.api.updateSettings(enabled);
    const before = this.enabled();
    if (enabled !== undefined) this.enabled.set(enabled);
    this.busy.set(true);
    this.failed.set(false);
    this.message.set(enabled === undefined ? 'Clearing history…' : 'Saving preference…');
    request
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (this.api.session() === session) this.busy.set(false);
        }),
      )
      .subscribe({
        next: () => {
          if (this.api.session() !== session) return;
          if (enabled !== undefined) this.enabled.set(enabled);
          this.message.set(
            enabled === undefined ? 'Recommendation history cleared.' : 'Preference saved.',
          );
        },
        error: () => {
          if (this.api.session() !== session) return;
          if (enabled !== undefined) this.enabled.set(before);
          this.failed.set(true);
          this.message.set(
            enabled === undefined
              ? 'Could not clear recommendation history.'
              : 'Could not save your preference.',
          );
        },
      });
  }
}
