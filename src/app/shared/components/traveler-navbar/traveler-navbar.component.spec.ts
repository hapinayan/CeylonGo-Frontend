import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { FavoriteService } from '../../../features/artisan/services/favorite.service';
import { TravelerNavbarComponent } from './traveler-navbar.component';

describe('TravelerNavbarComponent', () => {
  let component: TravelerNavbarComponent;
  let fixture: ComponentFixture<TravelerNavbarComponent>;

  const authServiceMock = {
    currentUser: vi.fn().mockReturnValue(null),
    logout: vi.fn(),
  };

  const favoriteServiceMock = {
    productFavoriteIds: vi.fn().mockReturnValue(new Set([1, 2])),
    businessWishlistIds: vi.fn().mockReturnValue(new Set([10])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelerNavbarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: FavoriteService, useValue: favoriteServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelerNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders brand logo and nav links', () => {
    const brand = fixture.nativeElement.querySelector('.navbar-brand');
    expect(brand).toBeTruthy();

    const links = fixture.nativeElement.querySelectorAll('.nav-link');
    expect(links.length).toBeGreaterThanOrEqual(5);
  });

  it('calculates total favorites badge count correctly', () => {
    expect(component.favoriteCount()).toBe(3);
  });

  it('toggles mobile drawer on hamburger button click', () => {
    expect(component.isMenuOpen()).toBe(false);
    component.toggleMenu();
    expect(component.isMenuOpen()).toBe(true);
    component.closeMenus();
    expect(component.isMenuOpen()).toBe(false);
  });
});
