import { Component, Input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ExperienceItem {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly image: string;
  readonly isDemo?: boolean;
}

@Component({
  selector: 'app-experience-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-card.html',
  styleUrls: ['./experience-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceCard {
  @Input({ required: true }) experience!: ExperienceItem;

  readonly isWishlisted = signal(false);

  toggleWishlist(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.isWishlisted.update((val) => !val);
  }
}
