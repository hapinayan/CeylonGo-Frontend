import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiPlannerBanner } from './ai-planner-banner';

describe('AiPlannerBanner', () => {
  let component: AiPlannerBanner;
  let fixture: ComponentFixture<AiPlannerBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPlannerBanner],
    }).compileComponents();

    fixture = TestBed.createComponent(AiPlannerBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the AI trip planner banner component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the heading, description, and button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const titleEl = el.querySelector('#ai-banner-title');
    const descEl = el.querySelector('.banner-description');
    const btnEl = el.querySelector('.btn-try-ai');
    const imgEl = el.querySelector('.banner-laptop-img') as HTMLImageElement;

    expect(titleEl?.textContent?.trim()).toBe('Plan Your Trip with AI');
    expect(descEl?.textContent).toContain('Get a personalized Sri Lanka itinerary');
    expect(btnEl?.textContent).toContain('Try AI Trip Planner');
    expect(imgEl.src).toContain('/images/banners/ai-trip-planner.webp');
  });

  it('should emit actionClick when Try AI Trip Planner button is clicked', () => {
    let clicked = false;
    component.actionClick.subscribe(() => {
      clicked = true;
    });

    const btnEl = fixture.nativeElement.querySelector('.btn-try-ai') as HTMLButtonElement;
    btnEl.click();
    fixture.detectChanges();

    expect(clicked).toBe(true);
  });
});
