import { Component, Input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HomestayItem {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly price: number; // in LKR
  readonly image: string;
  readonly isDemo?: boolean;
}

@Component({
  selector: 'app-homestay-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './homestay-card.html',
  styleUrls: ['./homestay-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomestayCard {
  @Input({ required: true }) homestay!: HomestayItem;

  readonly isWishlisted = signal(false);

  toggleWishlist(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.isWishlisted.update((val) => !val);
  }
}
