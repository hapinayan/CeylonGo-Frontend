import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (hasNoReviews()) {
      <div class="no-reviews-container">
        <span class="no-reviews-text">No reviews yet</span>
      </div>
    } @else {
      <div class="rating-container" [attr.aria-label]="formattedRating() + ' out of 5 stars'">
        <svg class="star-icon" width="16" height="16" viewBox="0 0 24 24" fill="#FFB800" stroke="#FFB800" stroke-width="1" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span class="rating-value">{{ formattedRating() }}</span>
        @if (reviewCount !== undefined && reviewCount !== null) {
          <span class="review-count">({{ reviewCount }})</span>
        }
      </div>
    }
  `,
  styles: [`
    .rating-container {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: #1e293b;
    }
    .star-icon {
      flex-shrink: 0;
    }
    .rating-value {
      font-weight: 700;
      color: #0f172a;
    }
    .review-count {
      color: #64748b;
      font-weight: 500;
    }
    .no-reviews-container {
      display: inline-flex;
      align-items: center;
    }
    .no-reviews-text {
      font-size: 0.8125rem;
      color: #64748b;
      font-weight: 500;
    }
  `],
})
export class RatingStarsComponent {
  @Input() rating: number | null = null;
  @Input() reviewCount?: number | null;

  readonly hasNoReviews = computed(() => {
    if (this.reviewCount === 0) return true;
    if (this.rating === 0 && (this.reviewCount === undefined || this.reviewCount === 0 || this.reviewCount === null)) {
      return true;
    }
    return false;
  });

  readonly formattedRating = computed(() => {
    if (this.rating === null || this.rating === undefined || isNaN(this.rating)) {
      return '0.0';
    }
    return Number(this.rating).toFixed(1);
  });
}
