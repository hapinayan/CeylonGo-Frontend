import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TourGuidesComponent } from './tour-guides.component';
import { TourGuideService } from '../../core/services/tour-guide.service';

describe('TourGuidesComponent', () => {
  let component: TourGuidesComponent;
  let fixture: ComponentFixture<TourGuidesComponent>;
  let guideService: TourGuideService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourGuidesComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(TourGuidesComponent);
    component = fixture.componentInstance;
    guideService = TestBed.inject(TourGuideService);
    fixture.detectChanges();
  });

  it('should create the Tour Guides discover page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the main page heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('.hero-title');
    expect(title?.textContent).toContain('Find Local Tour Guides in Sri Lanka');
  });

  it('should render the 8 category pills matching the approved design', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const pills = compiled.querySelectorAll('.category-pill-btn');
    expect(pills.length).toBe(8);
    expect(pills[0].textContent).toContain('All Guides');
  });

  it('should render 8 tour guide cards on the first page', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.guide-card');
    expect(cards.length).toBe(8);
  });

  it('should render Chaminda Perera card with rating and price', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCard = compiled.querySelector('.guide-card');
    expect(firstCard?.textContent).toContain('Chaminda Perera');
    expect(firstCard?.textContent).toContain('LKR 8,000');
    expect(firstCard?.textContent).toContain('4.9');
  });

  it('should open and close filter modal', () => {
    expect(component.isFilterModalOpen()).toBe(false);
    component.openFilterModal();
    expect(component.isFilterModalOpen()).toBe(true);
    component.closeFilterModal();
    expect(component.isFilterModalOpen()).toBe(false);
  });

  it('should change page when pagination clicked', () => {
    expect(component.currentPage()).toBe(1);
    component.goToPage(2);
    expect(component.currentPage()).toBe(2);
  });

  it('should render skeleton loading state when isLoading is true', () => {
    guideService.isLoading.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const skeletonCards = compiled.querySelectorAll('.skeleton-card');
    expect(skeletonCards.length).toBe(8);

    guideService.isLoading.set(false);
    fixture.detectChanges();
  });

  it('should render explicit error state with retry button when errorMessage is present', () => {
    guideService.errorMessage.set('Backend tour-guide endpoint returned 404');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const errorTitle = compiled.querySelector('.error-title');
    const errorDesc = compiled.querySelector('.error-desc');
    const retryBtn = compiled.querySelector('.retry-btn');

    expect(errorTitle?.textContent).toContain('Unable to Load Tour Guides');
    expect(errorDesc?.textContent).toContain('Backend tour-guide endpoint returned 404');
    expect(retryBtn).toBeTruthy();

    guideService.errorMessage.set(null);
    fixture.detectChanges();
  });

  it('should display demo mode badge in booking modal', () => {
    const testGuide = guideService.allGuides()[0];
    component.openBookingModal(testGuide, new MouseEvent('click'));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const alert = compiled.querySelector('.demo-mode-alert');
    expect(alert?.textContent).toContain('DEMO INQUIRY MODE');
    expect(alert?.textContent).toContain('No payment is charged');

    component.closeBookingModal();
    fixture.detectChanges();
  });
});
