import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CategoryPillItem {
  id: string; // Canonical category identifier used across app & backend ('' for All)
  label: string; // Display label matching approved UI
}

@Component({
  selector: 'app-category-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-bar.component.html',
  styleUrl: './category-bar.component.scss',
})
export class CategoryBarComponent {
  private readonly elementRef = inject(ElementRef);

  @Input() selectedCategory: string | null = null;
  private readonly _allCategories = signal<string[]>([]);

  @Input()
  set allCategories(value: string[]) {
    this._allCategories.set(value || []);
  }
  get allCategories(): string[] {
    return this._allCategories();
  }
  @Output() categorySelected = new EventEmitter<string | null>();

  readonly showMoreDropdown = signal<boolean>(false);

  /**
   * Primary 7 categories matching approved CeylonGo Artisan UI specification.
   */
  readonly primaryCategories: CategoryPillItem[] = [
    { id: '', label: 'All Artisans' },
    { id: 'Handicrafts', label: 'Handicrafts' },
    { id: 'Pottery', label: 'Pottery' },
    { id: 'Batik & Textiles', label: 'Batik & Textiles' },
    { id: 'Handmade', label: 'Handmade' },
    { id: 'Jewellery', label: 'Jewellery' },
    { id: 'Local Products', label: 'Local Products' },
  ];

  /**
   * Backward compatibility alias for tests checking categories array.
   */
  get categories(): CategoryPillItem[] {
    return this.primaryCategories;
  }

  /**
   * Scalable additional categories sourced from dynamic data source not already covered in primary tabs.
   */
  readonly extraCategories = computed(() => {
    const primaryNormalized = new Set(
      this.primaryCategories.map((c) => c.id.toLowerCase()).filter((id) => id !== '')
    );
    primaryNormalized.add('pottery & ceramics');
    primaryNormalized.add('handmade & weaving');
    primaryNormalized.add('jewelry & gem craft');
    primaryNormalized.add('jewellery & gem craft');

    return (this._allCategories() || []).filter(
      (cat) => cat && !primaryNormalized.has(cat.trim().toLowerCase())
    );
  });

  readonly isMoreActive = computed(() => {
    if (!this.selectedCategory) return false;
    const current = this.selectedCategory.trim().toLowerCase();
    return this.extraCategories().some((c) => c.toLowerCase() === current);
  });

  readonly moreButtonLabel = computed(() => {
    if (this.isMoreActive() && this.selectedCategory) {
      return `More (${this.selectedCategory})`;
    }
    return 'More';
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showMoreDropdown.set(false);
    }
  }

  toggleMoreDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showMoreDropdown.update((v) => !v);
  }

  select(id: string): void {
    this.showMoreDropdown.set(false);
    const val = id === '' ? null : id;
    this.categorySelected.emit(val);
  }

  selectFromMore(cat: string): void {
    this.showMoreDropdown.set(false);
    this.categorySelected.emit(cat);
  }

  isSelected(id: string): boolean {
    if (id === '' && (!this.selectedCategory || this.selectedCategory.trim() === '')) return true;
    if (!this.selectedCategory) return false;
    const current = this.selectedCategory.trim().toLowerCase();
    const target = id.toLowerCase();

    if (target === 'handicrafts') {
      return (
        current === 'handicrafts' ||
        current === 'woodcarving & masks' ||
        current === 'brass & metalware' ||
        current === 'traditional handicrafts'
      );
    }
    if (target === 'pottery') {
      return current === 'pottery' || current === 'pottery & ceramics';
    }
    if (target === 'batik & textiles') {
      return current === 'batik & textiles' || current === 'batik';
    }
    if (target === 'handmade') {
      return current === 'handmade' || current === 'handloom & weaving' || current === 'handmade & weaving';
    }
    if (target === 'jewellery') {
      return current === 'jewellery' || current === 'jewelry & gem craft' || current === 'jewellery & gem craft' || current === 'jewelry';
    }
    if (target === 'local products') {
      return current === 'local products' || current === 'spices & herbal products' || current === 'spices';
    }
    return current === target;
  }
}
