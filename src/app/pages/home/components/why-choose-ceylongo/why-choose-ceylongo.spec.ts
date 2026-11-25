import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhyChooseCeylongo } from './why-choose-ceylongo';

describe('WhyChooseCeylongo', () => {
  let component: WhyChooseCeylongo;
  let fixture: ComponentFixture<WhyChooseCeylongo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhyChooseCeylongo],
    }).compileComponents();

    fixture = TestBed.createComponent(WhyChooseCeylongo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the WhyChooseCeylongo component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the section heading and subtitle', () => {
    const el: HTMLElement = fixture.nativeElement;
    const heading = el.querySelector('#why-ceylongo-heading');
    expect(heading?.textContent?.trim()).toBe('Why Choose CeylonGo?');
    const subtitle = el.querySelector('.section-subtitle');
    expect(subtitle?.textContent?.trim()).toContain('Discover a more authentic way to experience Sri Lanka');
  });

  it('should render all 5 USPs in the grid', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cards = el.querySelectorAll('.feature-card');
    expect(cards.length).toBe(5);

    const titles = Array.from(cards).map(
      (c) => c.querySelector('.feature-title')?.textContent?.trim()
    );
    expect(titles).toEqual([
      'Community-Based Tourism',
      'Local Business & Artisan Promotion',
      'Direct Local Connections',
      'AI-Powered Travel Planning',
      'All-in-One Local Tourism Platform',
    ]);
  });

  it('should have the correct section ID for in-page navigation anchor', () => {
    const el: HTMLElement = fixture.nativeElement;
    const section = el.querySelector('#why-ceylongo');
    expect(section).toBeTruthy();
  });
});
