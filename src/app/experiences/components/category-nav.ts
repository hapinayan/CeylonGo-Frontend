import { Component, input, output } from '@angular/core';
import { categories, Category } from '../models/catalog';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-experience-categories',
  imports: [ExperienceIcon],
  template: `
    <nav class="category-nav" aria-label="Experience categories">
      @for (category of categories; track category.id) {
        <button type="button" [disabled]="live() && category.id !== 'all' && category.id !== 'eco'" [attr.aria-pressed]="selected() === category.id" (click)="select.emit(category.id)">
          <span class="category-icon"><app-experience-icon [name]="category.icon" /></span>
          {{ category.label }}
        </button>
      }
    </nav>
  `,
})
export class CategoryNav {
  readonly categories = categories;
  readonly live = input(false);
  readonly selected = input.required<Category>();
  readonly select = output<Category>();
}
