import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/auth.models';
import { FavoriteService } from './favorite.service';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let httpMock: HttpTestingController;
  let currentUserSignal = signal<User | null>(null);
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    currentUser: typeof currentUserSignal;
  };

  const favoritesUrl = `${environment.apiBaseUrl}/artisan-product-favorites`;
  const listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;

  beforeEach(() => {
    TestBed.resetTestingModule();

    currentUserSignal = signal<User | null>(null);
    authServiceMock = {
      isAuthenticated: vi.fn().mockReturnValue(false),
      currentUser: currentUserSignal,
    };

    TestBed.configureTestingModule({
      providers: [
        FavoriteService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(FavoriteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('optimistically adds product favorite and commits PUT request', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    service.productFavoriteIds.set(new Set());

    service.toggleProductFavorite(101).subscribe((res) => {
      expect(res.isFavorite).toBe(true);
      expect(service.isProductFavorite(101)).toBe(true);
    });

    const req = httpMock.expectOne(`${favoritesUrl}/101`);
    expect(req.request.method).toBe('PUT');
    req.flush({ product_id: 101, created_at: '2026-01-01', product: {} });
  });

  it('optimistically removes product favorite on second toggle and sends DELETE', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    service.productFavoriteIds.set(new Set([101]));

    service.toggleProductFavorite(101).subscribe((res) => {
      expect(res.isFavorite).toBe(false);
      expect(service.isProductFavorite(101)).toBe(false);
    });

    const req = httpMock.expectOne(`${favoritesUrl}/101`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('rolls back optimistic state if API request fails', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    service.productFavoriteIds.set(new Set());

    service.toggleProductFavorite(999).subscribe({
      next: () => {},
      error: () => {
        expect(service.isProductFavorite(999)).toBe(false);
      },
    });

    const req = httpMock.expectOne(`${favoritesUrl}/999`);
    req.flush('Error saving favorite', { status: 500, statusText: 'Server Error' });
  });

  it('rejects toggle if traveler is unauthenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    service.toggleProductFavorite(101).subscribe({
      next: () => {},
      error: (err) => {
        expect(err.message).toBe('AUTHENTICATION_REQUIRED');
      },
    });

    httpMock.expectNone(`${favoritesUrl}/101`);
  });

  it('prevents concurrent duplicate toggle requests for same product', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    service.productFavoriteIds.set(new Set());

    // First click initiates request
    service.toggleProductFavorite(105).subscribe();
    const req = httpMock.expectOne(`${favoritesUrl}/105`);

    // Rapid second click while first is in-flight returns current state without second HTTP call
    service.toggleProductFavorite(105).subscribe((res) => {
      expect(res.isFavorite).toBe(true);
    });

    httpMock.expectNone(`${favoritesUrl}/105`);
    req.flush({ product_id: 105, created_at: '2026-01-01', product: {} });
  });

  it('toggles business wishlist with POST and DELETE', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    service.businessWishlistIds.set(new Set());

    service.toggleBusinessWishlist(5).subscribe((res) => {
      expect(res.isSaved).toBe(true);
      expect(service.isBusinessSaved(5)).toBe(true);
    });

    const req = httpMock.expectOne(`${listingsUrl}/5/wishlist`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, artisan_listing_id: 5 });
  });
});
