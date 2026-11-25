import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DestinationCard, Destination } from './destination-card';

describe('DestinationCard Component', () => {
  let component: DestinationCard;
  let fixture: ComponentFixture<DestinationCard>;

  const mockDestination: Destination = {
    id: 'ella',
    name: 'Ella',
    description: 'Scenic train rides and misty hills.',
    image: '/images/destinations/ella.png'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DestinationCard]
    }).compileComponents();

    fixture = TestBed.createComponent(DestinationCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('destination', mockDestination);
    fixture.detectChanges();
  });

  it('should create the destination card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render destination name and description correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const nameEl = compiled.querySelector('.destination-name');
    const descEl = compiled.querySelector('.destination-desc');

    expect(nameEl?.textContent).toBe('Ella');
    expect(descEl?.textContent).toBe('Scenic train rides and misty hills.');
  });

  it('should render destination image with correct alt and source', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const imgEl = compiled.querySelector('.card-image') as HTMLImageElement;

    expect(imgEl).toBeTruthy();
    expect(imgEl.src).toContain('/images/destinations/ella.png');
    expect(imgEl.alt).toContain('Ella');
  });

  it('should render the circular arrow action button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const arrowBtn = compiled.querySelector('.card-arrow-btn') as HTMLButtonElement;

    expect(arrowBtn).toBeTruthy();
    expect(arrowBtn.getAttribute('aria-label')).toBe('Explore Ella');
  });
});
