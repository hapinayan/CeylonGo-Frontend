import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect } from 'vitest';

import { ArtisanLandingComponent } from './artisan-landing.component';
import { AuthService } from '../../../../core/services/auth.service';
import { FavoriteService } from '../../services/favorite.service';

describe('ArtisanLandingComponent', () => {
  let component: ArtisanLandingComponent;
  let fixture: ComponentFixture<ArtisanLandingComponent>;

  const authServiceMock = {
    currentUser: () => null,
    isAuthenticated: () => false,
  };

  const favoriteServiceMock = {
    wishlistCount: () => 0,
    isBusinessSaved: () => false,
    productFavoriteIds: () => new Set(),
    businessWishlistIds: () => new Set(),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ArtisanLandingComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: FavoriteService, useValue: favoriteServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of({
              get: (key: string) => (key === 'demo' ? 'true' : null),
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtisanLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders landing hero with title, subtitle, and Explore Artisans CTA', () => {
    const el = fixture.nativeElement;
    const title = el.querySelector('.hero-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain('Discover Sri Lanka’s Local Artisans');

    const subtitle = el.querySelector('.hero-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle.textContent).toContain('Connect directly with master craftspeople');

    const cta = el.querySelector('.primary-hero-btn');
    expect(cta).toBeTruthy();
    expect(cta.textContent).toContain('Explore Artisans');
  });

  it('has Explore Artisans button navigating to /artisans/discover', () => {
    const el = fixture.nativeElement;
    const cta = el.querySelector('.primary-hero-btn');
    expect(cta.getAttribute('href') || cta.getAttribute('ng-reflect-router-link')).toContain(
      '/artisans/discover'
    );
  });

  it('completely removes categories, locations, and featured artisan sections from the landing page', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('.categories-section')).toBeFalsy();
    expect(el.querySelector('.location-section')).toBeFalsy();
    expect(el.querySelector('.featured-section')).toBeFalsy();
    expect(el.querySelector('.category-cards-grid')).toBeFalsy();
    expect(el.querySelector('.district-cards-grid')).toBeFalsy();
    expect(el.querySelector('.artisan-cards-grid')).toBeFalsy();
  });

  it('renders demo mode banner when demo mode is active', () => {
    const el = fixture.nativeElement;
    const demoBanner = el.querySelector('.demo-banner');
    expect(demoBanner).toBeTruthy();
    expect(demoBanner.textContent).toContain('Demo Mode Active');
  });
});
