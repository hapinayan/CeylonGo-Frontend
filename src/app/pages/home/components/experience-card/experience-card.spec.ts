import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExperienceCard, ExperienceItem } from './experience-card';

describe('ExperienceCard', () => {
  let component: ExperienceCard;
  let fixture: ComponentFixture<ExperienceCard>;

  const mockExperience: ExperienceItem = {
    id: 'wildlife-safari',
    name: 'Wildlife Safari',
    location: 'Yala National Park',
    rating: 4.9,
    reviewCount: 156,
    image: '/images/experiences/wildlife-safari.webp',
    isDemo: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperienceCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ExperienceCard);
    component = fixture.componentInstance;
    component.experience = mockExperience;
    fixture.detectChanges();
  });

  it('should create the experience card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render experience name, location, and rating', () => {
    const el: HTMLElement = fixture.nativeElement;
    const nameEl = el.querySelector('.experience-name');
    const locationEl = el.querySelector('.experience-location');
    const ratingEl = el.querySelector('.rating-val');
    const reviewEl = el.querySelector('.review-count');
    const imgEl = el.querySelector('.experience-image') as HTMLImageElement;

    expect(nameEl?.textContent?.trim()).toBe('Wildlife Safari');
    expect(locationEl?.textContent?.trim()).toContain('Yala National Park');
    expect(ratingEl?.textContent?.trim()).toBe('4.9');
    expect(reviewEl?.textContent?.trim()).toBe('(156)');
    expect(imgEl.src).toContain('/images/experiences/wildlife-safari.webp');
    expect(imgEl.alt).toBe('Wildlife Safari in Yala National Park');
  });

  it('should toggle wishlist state on click', () => {
    expect(component.isWishlisted()).toBe(false);

    const button = fixture.nativeElement.querySelector('.btn-wishlist') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(component.isWishlisted()).toBe(true);
    expect(button.classList.contains('active')).toBe(true);

    button.click();
    fixture.detectChanges();

    expect(component.isWishlisted()).toBe(false);
    expect(button.classList.contains('active')).toBe(false);
  });
});
