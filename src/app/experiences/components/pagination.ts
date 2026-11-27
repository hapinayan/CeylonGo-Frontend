import { Component, computed, input, output } from '@angular/core';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-experience-pagination',
  imports: [ExperienceIcon],
  template: `
    @if (showPagination()) {
      <nav class="pagination" aria-label="Experience result pages">
        <button
          type="button"
          aria-label="Previous page"
          [disabled]="page() <= 1"
          (click)="change.emit(page() - 1)"
        >
          <app-experience-icon name="previous" />
        </button>
        <span class="pagination-current" aria-current="page">Page {{ page() }}</span>
        <button
          type="button"
          aria-label="Next page"
          [disabled]="!canGoNext()"
          (click)="change.emit(page() + 1)"
        >
          <app-experience-icon name="next" />
        </button>
      </nav>
    }
  `,
  styles: `
    .pagination-current {
      display: inline-flex;
      align-items: center;
      padding: 0 0.9rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #082b5c;
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly hasNext = input(false);
  readonly totalPages = input<number | null>(null);
  readonly change = output<number>();

  readonly canGoNext = computed(() => {
    const total = this.totalPages();
    if (total != null) return this.page() < total;
    return this.hasNext();
  });

  readonly showPagination = computed(() => this.page() > 1 || this.canGoNext());
}
