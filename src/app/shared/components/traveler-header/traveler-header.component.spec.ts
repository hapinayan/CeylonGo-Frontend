import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TravelerHeaderComponent } from './traveler-header.component';

describe('TravelerHeaderComponent', () => {
  let component: TravelerHeaderComponent;
  let fixture: ComponentFixture<TravelerHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelerHeaderComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(TravelerHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the Traveler Header component', () => {
    expect(component).toBeTruthy();
  });

  it('should render CeylonGo brand logo', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-ceylon')?.textContent).toBe('Ceylon');
    expect(compiled.querySelector('.brand-go')?.textContent).toBe('Go');
  });

  it('should render navigation links matching design', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const navText = compiled.querySelector('.traveler-nav')?.textContent;
    expect(navText).toContain('Stays');
    expect(navText).toContain('Experiences');
    expect(navText).toContain('Tour Guides');
    expect(navText).toContain('Bike Rentals');
    expect(navText).toContain('Community');
    expect(navText).toContain('AI Trip Planner');
  });

  it('should toggle profile and notifications dropdowns', () => {
    const mockEvent = new MouseEvent('click');
    expect(component.isProfileMenuOpen()).toBe(false);
    component.toggleProfileMenu(mockEvent);
    expect(component.isProfileMenuOpen()).toBe(true);

    component.toggleNotifications(mockEvent);
    expect(component.isNotificationsOpen()).toBe(true);
    expect(component.isProfileMenuOpen()).toBe(false);
  });
});
