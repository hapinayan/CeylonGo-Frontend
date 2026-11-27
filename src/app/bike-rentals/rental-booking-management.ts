import { DatePipe, DecimalPipe, ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthModalService } from '../core/services/auth-modal.service';
import { AuthService } from '../core/services/auth.service';
import { RentalBookingPreviewStore, SAMPLE_TRAVELER, canCancelPreview } from './rental-booking-preview.store';

@Component({
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './rental-booking-management.html',
  styleUrl: './rental-booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentalBookingManagement {
  private readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  private readonly store = inject(RentalBookingPreviewStore);
  private readonly route = inject(ActivatedRoute);
  private readonly viewport = inject(ViewportScroller);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly reference = computed(() => this.params().get('reference'));
  readonly owner = computed(() => {
    const user = this.auth.currentUser();
    return this.auth.isAuthenticated() && user?.role === 'traveler' && user.is_active ? user.id : null;
  });
  readonly records = computed(() => {
    const owner = this.owner();
    return owner === null ? [] : this.store.rentals(owner);
  });
  readonly rental = computed(() => this.records().find(record => record.reference === this.reference()));
  readonly canCancel = canCancelPreview;
  readonly traveler = SAMPLE_TRAVELER;
  private readonly selection = computed(() => ({ owner: this.owner(), reference: this.reference() }));
  readonly cancellationOpen = linkedSignal({ source: this.selection, computation: () => false });
  readonly message = linkedSignal({ source: this.selection, computation: () => '' });

  constructor() { afterNextRender(() => this.viewport.scrollToPosition([0, 0])); }

  openSignIn(event: Event): void { this.authModal.open('login', event.currentTarget as HTMLElement); }

  cancel(): void {
    const owner = this.owner();
    const reference = this.reference();
    if (!this.cancellationOpen() || owner === null || !reference) return;
    this.message.set(this.store.cancel(owner, reference) ? 'Sample booking cancelled.' : 'This sample booking can no longer be cancelled.');
    this.cancellationOpen.set(false);
  }
}
