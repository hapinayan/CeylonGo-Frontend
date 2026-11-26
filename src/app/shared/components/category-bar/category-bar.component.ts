import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ArtisanCategoryCard {
  id: string;
  label: string;
  apiValue: string | null;
  icon: 'all' | 'handicrafts' | 'pottery' | 'batik' | 'weaving' | 'jewellery' | 'woodcarving' | 'local' | 'spices';
}

export const ARTISAN_ICON_CATEGORIES: readonly ArtisanCategoryCard[] = [
  { id: 'all', label: 'All Artisans', apiValue: null, icon: 'all' },
  { id: 'handicrafts', label: 'Handicrafts', apiValue: 'Handicrafts', icon: 'handicrafts' },
  { id: 'pottery', label: 'Pottery & Ceramics', apiValue: 'Pottery & Ceramics', icon: 'pottery' },
  { id: 'batik', label: 'Batik & Textiles', apiValue: 'Batik & Textiles', icon: 'batik' },
  { id: 'weaving', label: 'Handmade & Weaving', apiValue: 'Handmade & Weaving', icon: 'weaving' },
  { id: 'jewellery', label: 'Jewellery & Gem Craft', apiValue: 'Jewellery & Gem Craft', icon: 'jewellery' },
  { id: 'woodcarving', label: 'Woodcarving & Masks', apiValue: 'Woodcarving & Masks', icon: 'woodcarving' },
  { id: 'local', label: 'Local Products', apiValue: 'Local Products', icon: 'local' },
  { id: 'spices', label: 'Spices & Herbal Products', apiValue: 'Spices & Herbal Products', icon: 'spices' },
];

@Component({
  selector: 'app-category-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-bar.component.html',
  styleUrl: './category-bar.component.scss',
})
export class CategoryBarComponent {
  @Input() selectedCategory: string | null = null;
  @Input() allCategories: string[] = [];
  @Output() categorySelected = new EventEmitter<string | null>();

  readonly categories = ARTISAN_ICON_CATEGORIES;

  isSelected(card: ArtisanCategoryCard): boolean {
    if (!this.selectedCategory && card.apiValue === null) {
      return true;
    }
    if (!this.selectedCategory || !card.apiValue) {
      return false;
    }
    const current = this.selectedCategory.trim().toLowerCase();
    const target = card.apiValue.trim().toLowerCase();
    if (current === target) return true;
    if (card.id === 'jewellery' && current.includes('jewel')) return true;
    return false;
  }

  select(card: ArtisanCategoryCard): void {
    this.categorySelected.emit(card.apiValue);
  }
}
