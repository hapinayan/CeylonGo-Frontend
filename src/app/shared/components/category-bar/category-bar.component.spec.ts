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

  it('renders all 9 blue outline icon category cards', () => {
    const cards = fixture.nativeElement.querySelectorAll('.category-icon-card');
    expect(cards.length).toBe(9);
    const svgs = fixture.nativeElement.querySelectorAll('.category-icon-card svg');
    expect(svgs.length).toBe(9);
  });

  it('emits selected category when a category icon card is clicked', () => {
    let selected: string | null = 'initial';
    component.categorySelected.subscribe((cat) => {
      selected = cat;
    });

    const pottery = component.categories[2];
    component.select(pottery);
    expect(selected).toBe('Pottery & Ceramics');

    component.select(component.categories[0]);
    expect(selected).toBeNull();
  });

  it('marks All Artisans selected when selectedCategory is null', () => {
    component.selectedCategory = null;
    fixture.detectChanges();
    expect(component.isSelected(component.categories[0])).toBe(true);
    expect(component.isSelected(component.categories[2])).toBe(false);
  });
});
