import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CategoryBarComponent } from './category-bar.component';

describe('CategoryBarComponent', () => {
  let component: CategoryBarComponent;
  let fixture: ComponentFixture<CategoryBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders all 7 category pills', () => {
    const pills = fixture.nativeElement.querySelectorAll('.category-pill');
    expect(pills.length).toBe(7);
  });

  it('emits selected category on pill click', () => {
    let selected: string | null = null;
    component.categorySelected.subscribe((cat) => {
      selected = cat;
    });

    component.select('Handicrafts');
    expect(selected).toBe('Handicrafts');

    component.select('');
    expect(selected).toBeNull();
  });

  it('marks "All" as active when selectedCategory is null', () => {
    component.selectedCategory = null;
    fixture.detectChanges();
    expect(component.isSelected('')).toBe(true);
  });

  it('renders More dropdown when extra categories are supplied from data source', () => {
    component.allCategories = ['Handicrafts', 'Pottery & Ceramics', 'Brass & Metalware', 'Spices & Herbal Products'];
    fixture.detectChanges();

    expect(component.extraCategories()).toContain('Brass & Metalware');
    expect(component.extraCategories()).toContain('Spices & Herbal Products');

    const moreBtn = fixture.nativeElement.querySelector('.more-btn');
    expect(moreBtn).toBeTruthy();
    expect(moreBtn.textContent).toContain('More');
  });

  it('selects category from More dropdown and emits value', () => {
    component.allCategories = ['Handicrafts', 'Brass & Metalware'];
    fixture.detectChanges();

    let selected: string | null = null;
    component.categorySelected.subscribe((cat) => {
      selected = cat;
    });

    component.selectFromMore('Brass & Metalware');
    expect(selected).toBe('Brass & Metalware');
    expect(component.showMoreDropdown()).toBe(false);
  });
});
