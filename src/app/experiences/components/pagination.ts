import { Component, computed, input, output } from '@angular/core';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-experience-pagination',
  imports: [ExperienceIcon],
  template: `
    @if (totalPages() > 1) {
      <nav class="pagination" aria-label="Experience result pages">
        <button type="button" aria-label="Previous page" [disabled]="page() === 1"
          (click)="change.emit(page() - 1)"><app-experience-icon name="previous" /></button>
        @for (number of pages(); track number) {
          <button type="button" [attr.aria-label]="'Page ' + number" [attr.aria-current]="page() === number ? 'page' : null"
            (click)="change.emit(number)">{{ number }}</button>
        }
        <button type="button" aria-label="Next page" [disabled]="page() === totalPages()"
          (click)="change.emit(page() + 1)"><app-experience-icon name="next" /></button>
      </nav>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly change = output<number>();
  readonly pages = computed(() => {
    const first = Math.max(1, Math.min(this.page() - 2, this.totalPages() - 4));
    return Array.from({ length: Math.min(5, this.totalPages()) }, (_, index) => first + index);
  });
}
