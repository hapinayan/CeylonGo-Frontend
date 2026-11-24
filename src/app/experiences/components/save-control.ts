import { Component, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExperienceIcon } from './icon';
import { EXPERIENCE_CATALOG } from '../services/catalog';
import { TravelSession } from '../services/travel-session';
import { WishlistState } from '../services/wishlist-state';
import { positiveId } from '../services/workflow-state';

@Component({
  selector: 'app-save-experience',
  imports: [RouterLink, ExperienceIcon],
  template: `
    @if (catalog.preview) {
      <button type="button" class="outline-control" [attr.aria-pressed]="wishlist.previewIds().has(id())"
        [attr.aria-label]="'Preview favorite: ' + title()" (click)="wishlist.togglePreview(id())"><app-experience-icon name="heart" /></button>
    } @else if (!session.account()) {
      <a class="outline-control" routerLink="/auth" [attr.aria-label]="'Sign in to save ' + title()"><app-experience-icon name="heart" /></a>
    } @else if (key(id()); as number) {
      @if (wishlist.ready()) {
        <button type="button" class="outline-control" [attr.aria-label]="'Favorite: ' + title()"
          [attr.aria-pressed]="wishlist.saved().has(number)" [disabled]="wishlist.busy(number)"
          (click)="wishlist.toggle(number)"><app-experience-icon name="heart" /></button>
      } @else if (wishlist.error()) {
        <button type="button" class="outline-control" (click)="wishlist.ensure()">Retry saved status</button>
      } @else {
        <button type="button" class="outline-control" disabled aria-label="Loading saved status"><app-experience-icon name="heart" /></button>
      }
    }
  `,
})
export class SaveControl {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly catalog = inject(EXPERIENCE_CATALOG);
  readonly wishlist = inject(WishlistState);
  readonly session = inject(TravelSession);
  readonly key = positiveId;

  constructor() {
    effect(() => {
      if (!this.catalog.preview && this.session.account()) untracked(() => this.wishlist.ensure());
    });
  }
}
