import { Component, effect, inject, input, untracked } from '@angular/core';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ExperienceIcon } from './icon';
import { TravelSession } from '../services/travel-session';
import { WishlistState } from '../services/wishlist-state';
import { positiveId } from '../services/workflow-state';

@Component({
  selector: 'app-save-experience',
  imports: [ExperienceIcon],
  template: `
    @if (key(id()); as number) {
      @if (!session.account()) {
        <button
          type="button"
          class="outline-control"
          [class.favorite]="!showLabel()"
          [attr.aria-label]="'Sign in to save ' + title()"
          [attr.aria-pressed]="false"
          (click)="promptSignIn(number, $event)"
        >
          <app-experience-icon name="heart" />
          @if (showLabel()) {
            <span>Save</span>
          }
        </button>
      } @else {
        <button
          type="button"
          class="outline-control"
          [class.favorite]="!showLabel()"
          [attr.aria-label]="'Favorite: ' + title()"
          [attr.aria-pressed]="wishlist.saved().has(number)"
          [disabled]="wishlist.busy(number)"
          (click)="wishlist.toggle(number)"
        >
          <app-experience-icon name="heart" />
          @if (showLabel()) {
            <span>{{ wishlist.saved().has(number) ? 'Saved' : 'Save' }}</span>
          }
        </button>
      }
    }
  `,
})
export class SaveControl {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly showLabel = input(false);
  readonly wishlist = inject(WishlistState);
  readonly session = inject(TravelSession);
  private readonly authModal = inject(AuthModalService);
  readonly key = positiveId;

  constructor() {
    effect(() => {
      if (this.session.account()) {
        untracked(() => this.wishlist.ensure());
      }
    });
  }

  promptSignIn(listingId: number, event: Event): void {
    const trigger = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    this.authModal.open('login', trigger, {
      type: 'wishlist',
      data: { listingId },
      resumeCallback: () => {
        if (this.session.account()) {
          this.wishlist.ensure();
          this.wishlist.save(listingId);
        }
      },
    });
  }
}
