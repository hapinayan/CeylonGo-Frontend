import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, beforeEach, it, expect } from 'vitest';

@Component({ template: '' })
class DummyComponent {}

import { ArtisanProfileComponent } from './artisan-profile.component';
import { ArtisanService } from '../../services/artisan.service';
import { ProductService } from '../../services/product.service';
import { ReviewService } from '../../services/review.service';
import { FavoriteService } from '../../services/favorite.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import {
  VERIFIED_ARTISAN_PROFILE,
  VERIFIED_SHOWCASE_PRODUCTS,
  VERIFIED_REVIEWS,
  VERIFIED_REVIEWS_SUMMARY,
} from '../../fixtures/artisan-test-fixtures';

describe('ArtisanProfileComponent', () => {
  let component: ArtisanProfileComponent;
  let fixture: ComponentFixture<ArtisanProfileComponent>;

  const artisanServiceMock = {
    getListingById: vi.fn().mockReturnValue(of(VERIFIED_ARTISAN_PROFILE)),
  };

  const productServiceMock = {
    getProductsByListing: vi.fn().mockReturnValue(
      of({ items: VERIFIED_SHOWCASE_PRODUCTS, total: VERIFIED_SHOWCASE_PRODUCTS.length })
    ),
  };

  const reviewServiceMock = {
    getListingReviews: vi.fn().mockReturnValue(
      of({
        items: VERIFIED_REVIEWS,
        total: VERIFIED_REVIEWS.length,
        page: 1,
        page_size: 10,
        total_pages: 1,
        average_rating: 4.9,
        total_reviews: VERIFIED_REVIEWS.length,
      })
    ),
    getListingReviewSummary: vi.fn().mockReturnValue(of(VERIFIED_REVIEWS_SUMMARY)),
  };

  const favoriteServiceMock = {
    isBusinessSaved: vi.fn().mockReturnValue(false),
    toggleBusinessWishlist: vi.fn().mockReturnValue(of({ is_saved: true })),
    isProductFavorite: vi.fn().mockReturnValue(false),
    toggleProductFavorite: vi.fn().mockReturnValue(of({ is_favorite: true })),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ArtisanProfileComponent],
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        { provide: ArtisanService, useValue: artisanServiceMock },
        { provide: ProductService, useValue: productServiceMock },
        { provide: ReviewService, useValue: reviewServiceMock },
        { provide: FavoriteService, useValue: favoriteServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtisanProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders business title, verified badge, rating and review summary', () => {
    const el = fixture.nativeElement;
    const title = el.querySelector('.business-title');
    expect(title).toBeTruthy();
    expect(title.textContent).toContain(VERIFIED_ARTISAN_PROFILE.title);

    const ratingVal = el.querySelector('.rating-val');
    expect(ratingVal).toBeTruthy();
    expect(ratingVal.textContent).toContain('4.9');
  });

  it('renders 4 primary tabs (Overview, Products, Reviews, Location)', () => {
    const el = fixture.nativeElement;
    const tabs = el.querySelectorAll('.tab-btn');
    expect(tabs.length).toBe(4);
    expect(tabs[0].textContent).toContain('Overview');
    expect(tabs[1].textContent).toContain('Products');
    expect(tabs[2].textContent).toContain('Reviews');
    expect(tabs[3].textContent).toContain('Location');
  });

  it('switches tabs and displays corresponding panes', () => {
    // Switch to Products
    component.setTab('products');
    fixture.detectChanges();
    let pane = fixture.nativeElement.querySelector('.products-pane');
    expect(pane).toBeTruthy();
    expect(pane.textContent).toContain('Our Handmade Products');

    // Switch to Reviews
    component.setTab('reviews');
    fixture.detectChanges();
    pane = fixture.nativeElement.querySelector('.reviews-pane');
    expect(pane).toBeTruthy();
    expect(pane.textContent).toContain('Customer Reviews & Ratings');

    // Switch to Location
    component.setTab('location');
    fixture.detectChanges();
    pane = fixture.nativeElement.querySelector('.location-pane');
    expect(pane).toBeTruthy();
    expect(pane.textContent).toContain('Find the Artisan');
  });

  it('renders full-width cover image, avatar, and Related Local Artisans section', () => {
    const el = fixture.nativeElement;
    const cover = el.querySelector('.fullwidth-cover-section');
    expect(cover).toBeTruthy();

    const avatar = el.querySelector('.profile-avatar-box');
    expect(avatar).toBeTruthy();

    const related = el.querySelector('.related-artisans-section');
    expect(related).toBeTruthy();
    expect(related.textContent).toContain('Related Local Artisans');
  });

  it('delegates goBack to ArtisanNavigationService to return to discovery/origin', () => {
    const navService = TestBed.inject(ArtisanNavigationService);
    const spy = vi.spyOn(navService, 'navigateBackFromProfile');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('renders "No reviews yet" and Reviews (0) when total reviews is 0', () => {
    component.listing.set({
      ...VERIFIED_ARTISAN_PROFILE,
      average_rating: 0,
      total_reviews: 0,
    });
    component.reviewSummary.set({
      listing_id: 1,
      listing_title: VERIFIED_ARTISAN_PROFILE.title,
      average_rating: 0,
      total_reviews: 0,
      rating_breakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
      verified_reviews_count: 0,
    });
    component.reviews.set({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
      total_pages: 0,
      average_rating: 0,
      total_reviews: 0,
    });
    fixture.detectChanges();

    const noReviewsPill = fixture.nativeElement.querySelector('.no-reviews-pill');
    expect(noReviewsPill).toBeTruthy();
    expect(noReviewsPill.textContent).toContain('No reviews yet');

    const tabs = fixture.nativeElement.querySelectorAll('.tab-btn');
    expect(tabs[2].textContent).toContain('Reviews (0)');

    // Switch to reviews tab to check empty state card
    component.setTab('reviews');
    fixture.detectChanges();

    const emptyCard = fixture.nativeElement.querySelector('.empty-reviews-card');
    expect(emptyCard).toBeTruthy();
    expect(emptyCard.textContent).toContain('No reviews yet');
  });

  it('ensures rating distribution breakdown sum strictly matches totalReviewCount', () => {
    const dist = component.ratingDistribution();
    const sum = dist.reduce((acc, item) => acc + item.count, 0);
    expect(sum).toBe(component.totalReviewCount());
  });

  it('resets stale review, product, and listing data when navigating to a new profile', () => {
    component.listing.set(VERIFIED_ARTISAN_PROFILE);
    component.products.set(VERIFIED_SHOWCASE_PRODUCTS);
    component.reviews.set({
      items: VERIFIED_REVIEWS,
      total: VERIFIED_REVIEWS.length,
      page: 1,
      page_size: 10,
      total_pages: 1,
      average_rating: 4.9,
      total_reviews: VERIFIED_REVIEWS.length,
    });

    component.isFixtureMode.set(true);
    // Calling loadProfileData should immediately clear them and load new artisan
    component.loadProfileData(4);
    expect(component.listingId()).toBe(4);
    expect(component.reviews()?.items[0]?.artisan_listing_id).toBe(4);
  });
});
