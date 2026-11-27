import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryShortcut, CategoryShortcutItem } from './category-shortcut';

describe('CategoryShortcut Component', () => {
  let component: CategoryShortcut;
  let fixture: ComponentFixture<CategoryShortcut>;

  const mockCategory: CategoryShortcutItem = {
    id: 'homestays',
    name: 'Homestays',
    icon: 'homestays',
    targetId: 'homestays'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryShortcut]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryShortcut);
    component = fixture.componentInstance;
    component.category = mockCategory;
    fixture.detectChanges();
  });

  it('should create the category shortcut component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the category label', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const label = compiled.querySelector('.shortcut-label');
    expect(label?.textContent?.trim()).toBe('Homestays');
  });

  it('should render the icon circle', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const circle = compiled.querySelector('.shortcut-icon-circle');
    expect(circle).toBeTruthy();
    expect(circle?.querySelector('svg')).toBeTruthy();
  });
});
