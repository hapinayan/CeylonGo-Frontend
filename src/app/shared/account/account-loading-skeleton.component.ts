import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-account-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrap" [attr.data-variant]="variant()" aria-busy="true" aria-label="Loading content">
      @for (idx of items(); track idx) {
        <div class="skeleton-card">
          @if (variant() === 'grid') {
            <div class="skel-thumb shimmer"></div>
          }
          <div class="skel-body">
            <div class="skel-line short shimmer"></div>
            <div class="skel-line title shimmer"></div>
            <div class="skel-line full shimmer"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-wrap {
      display: grid;
      gap: 0.9rem;
    }

    .skeleton-wrap[data-variant='grid'] {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 1080px) {
      .skeleton-wrap[data-variant='grid'] {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .skeleton-wrap[data-variant='grid'] {
        grid-template-columns: 1fr;
      }
    }

    .skeleton-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
    }

    .skel-thumb {
      height: 150px;
      background: #edf5ff;
    }

    .skel-body {
      padding: 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .skel-line {
      height: 12px;
      border-radius: 6px;
      background: #edf5ff;
    }

    .skel-line.short { width: 32%; }
    .skel-line.title { width: 64%; height: 16px; }
    .skel-line.full { width: 92%; }

    .shimmer {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: pulseSlide 1.4s ease-in-out infinite;
    }

    @keyframes pulseSlide {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class AccountLoadingSkeletonComponent {
  readonly variant = input<'list' | 'grid' | 'card'>('list');
  readonly count = input(3);

  items(): number[] {
    return Array.from({ length: Math.max(1, this.count()) }, (_, i) => i);
  }
}
