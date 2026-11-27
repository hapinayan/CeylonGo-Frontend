import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { categories, Category } from '../models/catalog';
import { ExperienceIcon } from './icon';

@Component({
  selector: 'app-experience-categories',
  standalone: true,
  imports: [CommonModule, ExperienceIcon],
  template: `
    <nav class="category-nav" aria-label="Experience categories">
      @for (category of categories; track category.id) {
        <button
          type="button"
          class="category-btn"
          [class.active]="selected() === category.id"
          [attr.aria-pressed]="selected() === category.id"
          [attr.aria-label]="category.label"
          (click)="select.emit(category.id)"
        >
          <div class="category-thumb-box" [class.icon-box]="!category.image">
            @if (category.image) {
              <img
                [src]="category.image"
                [alt]="category.label"
                class="category-photo"
                loading="lazy"
              />
            } @else {
              <div class="grid-icon-wrap">
                <app-experience-icon name="grid" />
              </div>
            }
          </div>
          <span class="category-label-text">{{ category.label }}</span>
        </button>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
  `,
})
export class CategoryNav {
  readonly categories = categories;
  readonly selected = input.required<Category>();
  readonly select = output<Category>();
}
