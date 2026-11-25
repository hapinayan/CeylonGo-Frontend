import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryCard, CategoryItem } from './category-card';

describe('CategoryCard Component', () => {
  let component: CategoryCard;
  let fixture: ComponentFixture<CategoryCard>;

  const mockCategory: CategoryItem = {
    id: 'homestays',
    title: 'Homestays',
    description: 'Stay with local families and experience true Sri Lankan hospitality.',
    image: '/images/categories/homestays.png',
    icon: 'homestays'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryCard]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('category', mockCategory);
    fixture.detectChanges();
  });

  it('should create the category card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the category title and description', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const titleEl = compiled.querySelector('.category-title');
    const descEl = compiled.querySelector('.category-desc');

    expect(titleEl?.textContent?.trim()).toBe('Homestays');
    expect(descEl?.textContent?.trim()).toBe('Stay with local families and experience true Sri Lankan hospitality.');
  });

  it('should render the category image', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const imgEl = compiled.querySelector('.category-image') as HTMLImageElement;

    expect(imgEl).toBeTruthy();
    expect(imgEl.src).toContain('/images/categories/homestays.png');
    expect(imgEl.alt).toContain('Homestays');
  });

  it('should render the circular arrow button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const btnEl = compiled.querySelector('.category-arrow-btn') as HTMLButtonElement;

    expect(btnEl).toBeTruthy();
    expect(btnEl.getAttribute('aria-label')).toBe('Explore Homestays');
  });
});
