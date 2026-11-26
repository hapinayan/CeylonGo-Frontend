import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ArtisanListingSummary } from '../../../features/artisan/models/artisan.models';
import { FavoriteService } from '../../../features/artisan/services/favorite.service';
import { ArtisanCardComponent } from './artisan-card.component';

describe('ArtisanCardComponent', () => {
  let component: ArtisanCardComponent;
  let fixture: ComponentFixture<ArtisanCardComponent>;

  const favoriteServiceMock = {
    isBusinessSaved: vi.fn().mockReturnValue(false),
    toggleBusinessWishlist: vi.fn().mockReturnValue(of({ isSaved: true })),
  };

  const mockListing: ArtisanListingSummary = {
    id: 1,
    provider_profile_id: 10,
    title: 'Kandy Heritage Crafts',
    craft_category: 'Woodcarving & Masks',
    district: 'Kandy',
    city: 'Kandy',
    latitude: 7.2906,
    longitude: 80.6337,
    cover_image_url: '/images/s2.jpeg',
    is_active: true,
    is_verified: true,
    is_featured: true,
    approval_status: 'approved',
    average_rating: 4.9,
    total_reviews: 186,
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ArtisanCardComponent],
      providers: [
        provideRouter([]),
        { provide: FavoriteService, useValue: favoriteServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtisanCardComponent);
    component = fixture.componentInstance;
    component.listing = mockListing;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders business title, verified badge, and location', () => {
    const title = fixture.nativeElement.querySelector('.card-title');
    expect(title.textContent).toContain('Kandy Heritage Crafts');

    const badge = fixture.nativeElement.querySelector('app-verified-badge');
    expect(badge).toBeTruthy();

    const location = fixture.nativeElement.querySelector('.location-text');
    expect(location.textContent).toContain('Kandy');
  });

  it('triggers wishlist toggle on heart click without navigating', () => {
    const event = new MouseEvent('click');
    const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    component.toggleWishlist(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
    expect(favoriteServiceMock.toggleBusinessWishlist).toHaveBeenCalledWith(1);
  });

  it('applies list-layout class when layout is list', () => {
    const testFixture = TestBed.createComponent(ArtisanCardComponent);
    const testComponent = testFixture.componentInstance;
    testComponent.listing = mockListing;
    testComponent.layout = 'list';
    testFixture.detectChanges();
    const card = testFixture.nativeElement.querySelector('.artisan-card');
    expect(card.classList.contains('list-layout')).toBe(true);
  });
});
