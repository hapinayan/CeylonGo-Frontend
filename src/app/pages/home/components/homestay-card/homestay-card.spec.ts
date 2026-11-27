import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomestayCard, HomestayItem } from './homestay-card';

describe('HomestayCard Component', () => {
  let component: HomestayCard;
  let fixture: ComponentFixture<HomestayCard>;

  const mockHomestay: HomestayItem = {
    id: 'sigiriya-village-homestay',
    name: 'Sigiriya Village Homestay',
    location: 'Sigiriya, Matale',
    rating: 4.9,
    reviewCount: 128,
    price: 8000,
    image: '/images/homestays/sigiriya-village-homestay.jpg'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomestayCard]
    }).compileComponents();

    fixture = TestBed.createComponent(HomestayCard);
    component = fixture.componentInstance;
    component.homestay = mockHomestay;
    fixture.detectChanges();
  });

  it('should create the homestay card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render property name, location, rating and price correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.homestay-name')?.textContent).toContain('Sigiriya Village Homestay');
    expect(compiled.querySelector('.homestay-location')?.textContent).toContain('Sigiriya, Matale');
    expect(compiled.querySelector('.rating-val')?.textContent).toContain('4.9');
    expect(compiled.querySelector('.review-count')?.textContent).toContain('(128)');
    expect(compiled.querySelector('.price-val')?.textContent).toContain('8,000');
  });

  it('should toggle wishlist state when clicking the heart button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const wishlistBtn = compiled.querySelector('.btn-wishlist') as HTMLButtonElement;

    expect(component.isWishlisted()).toBe(false);
    expect(wishlistBtn.classList.contains('active')).toBe(false);

    wishlistBtn.click();
    fixture.detectChanges();

    expect(component.isWishlisted()).toBe(true);
    expect(wishlistBtn.classList.contains('active')).toBe(true);
  });
});
