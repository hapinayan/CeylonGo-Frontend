import { Component, input } from '@angular/core';

export interface CategoryItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly icon: 'homestays' | 'activities' | 'nature';
}

@Component({
  selector: 'app-category-card',
  standalone: true,
  templateUrl: './category-card.html',
  styleUrl: './category-card.scss'
})
export class CategoryCard {
  readonly category = input.required<CategoryItem>();
}
