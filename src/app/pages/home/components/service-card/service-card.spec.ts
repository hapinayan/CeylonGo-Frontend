import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceCard, ServiceItem } from './service-card';

describe('ServiceCard Component', () => {
  let component: ServiceCard;
  let fixture: ComponentFixture<ServiceCard>;

  const mockService: ServiceItem = {
    id: 'homestays',
    name: 'Homestays',
    icon: 'homestays'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceCard]
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('service', mockService);
    fixture.detectChanges();
  });

  it('should create the service card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the service title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const titleEl = compiled.querySelector('.service-title');
    expect(titleEl?.textContent?.trim()).toBe('Homestays');
  });

  it('should render the service icon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const iconWrap = compiled.querySelector('.service-icon-wrap');
    expect(iconWrap?.querySelector('svg')).toBeTruthy();
  });
});
