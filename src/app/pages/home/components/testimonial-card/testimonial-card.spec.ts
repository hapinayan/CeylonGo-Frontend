import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestimonialCard, TestimonialItem } from './testimonial-card';

describe('TestimonialCard Component', () => {
  let component: TestimonialCard;
  let fixture: ComponentFixture<TestimonialCard>;

  const mockTestimonial: TestimonialItem = {
    id: 'amanda',
    name: 'Amanda R.',
    rating: 5,
    comment: 'An unforgettable experience! CeylonGo helped me discover beautiful places and connect with welcoming local hosts.',
    avatar: '/images/testimonials/amanda.png'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestimonialCard]
    }).compileComponents();

    fixture = TestBed.createComponent(TestimonialCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('testimonial', mockTestimonial);
    fixture.detectChanges();
  });

  it('should create the testimonial card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render traveler name, comment, and demo indicator', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nameEl = compiled.querySelector('.traveler-name');
    const quoteEl = compiled.querySelector('.testimonial-quote');
    const demoTag = compiled.querySelector('.demo-review-tag');

    expect(nameEl?.textContent?.trim()).toBe('Amanda R.');
    expect(quoteEl?.textContent).toContain('An unforgettable experience!');
    expect(demoTag?.textContent).toContain('Demo Traveler Story');
  });

  it('should render five stars with accessible rating label', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const starRating = compiled.querySelector('.star-rating');
    const stars = compiled.querySelectorAll('.star-icon');

    expect(starRating?.getAttribute('aria-label')).toBe('5 out of 5 stars');
    expect(stars.length).toBe(5);
  });

  it('should render avatar with accessible alt text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const avatar = compiled.querySelector('.traveler-avatar') as HTMLImageElement;

    expect(avatar).toBeTruthy();
    expect(avatar.src).toContain('/images/testimonials/amanda.png');
    expect(avatar.alt).toBe('Amanda R. avatar');
  });
});
