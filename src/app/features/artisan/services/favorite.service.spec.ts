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

  const wishlistUrl = `${environment.apiBaseUrl}/artisan-wishlists`;
  const listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;
  const travelerUser: User = {
    id: 10,
    email: 'traveler@ceylongo.lk',
    full_name: 'Traveler Tester',
    role: 'traveler',
    is_active: true,
    created_at: '',
  };

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

  it('optimistically saves business wishlist via POST and removes via DELETE', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    currentUserSignal.set(travelerUser);
    service.businessWishlistIds.set(new Set());

    service.toggleBusinessWishlist(121).subscribe((res) => {
      expect(res.isSaved).toBe(true);
      expect(service.isBusinessSaved(121)).toBe(true);
    });

    const postReq = httpMock.expectOne(`${listingsUrl}/121/wishlist`);
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ id: 1, artisan_listing_id: 121, user_id: 10, is_available: true, listing: null });

    service.toggleBusinessWishlist(121).subscribe((res) => {
      expect(res.isSaved).toBe(false);
      expect(service.isBusinessSaved(121)).toBe(false);
    });

    const delReq = httpMock.expectOne(`${listingsUrl}/121/wishlist`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('rolls back optimistic wishlist state if API fails', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    currentUserSignal.set(travelerUser);
    service.businessWishlistIds.set(new Set());

    service.toggleBusinessWishlist(999).subscribe({
      next: () => {},
      error: () => {
        expect(service.isBusinessSaved(999)).toBe(false);
      },
    });

    const req = httpMock.expectOne(`${listingsUrl}/999/wishlist`);
    req.flush('Error saving wishlist', { status: 500, statusText: 'Server Error' });
  });

  it('rejects wishlist toggle if traveler is unauthenticated', () => {
    authServiceMock.isAuthenticated.mockReturnValue(false);

    service.toggleBusinessWishlist(101).subscribe({
      next: () => {},
      error: (err) => {
        expect(err.message).toBe('AUTHENTICATION_REQUIRED');
      },
    });

    httpMock.expectNone(`${listingsUrl}/101/wishlist`);
  });

  it('prevents concurrent duplicate toggle requests for the same business', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    currentUserSignal.set(travelerUser);
    service.businessWishlistIds.set(new Set());

    service.toggleBusinessWishlist(105).subscribe();
    const req = httpMock.expectOne(`${listingsUrl}/105/wishlist`);

    service.toggleBusinessWishlist(105).subscribe((res) => {
      expect(res.isSaved).toBe(true);
    });

    httpMock.expectNone(`${listingsUrl}/105/wishlist`);
    req.flush({ id: 2, artisan_listing_id: 105, user_id: 10, is_available: true, listing: null });
  });

  it('checks individual wishlist status and loads paginated traveler wishlist from /artisan-wishlists/me', () => {
    authServiceMock.isAuthenticated.mockReturnValue(true);
    currentUserSignal.set(travelerUser);

    service.checkBusinessWishlist(121).subscribe((res) => {
      expect(res.is_saved).toBe(true);
      expect(service.isBusinessSaved(121)).toBe(true);
    });
    const checkReq = httpMock.expectOne(`${listingsUrl}/121/wishlist/check`);
    expect(checkReq.request.method).toBe('GET');
    checkReq.flush({ listing_id: 121, is_saved: true, wishlist_id: 4 });

    service.getBusinessWishlist(1, 20).subscribe((res) => {
      expect(res.items.length).toBe(1);
      expect(res.items[0].artisan_listing_id).toBe(121);
    });
    const listReq = httpMock.expectOne(
      (r) => r.url === `${wishlistUrl}/me` && r.params.get('page') === '1' && r.params.get('page_size') === '20',
    );
    expect(listReq.request.method).toBe('GET');
    listReq.flush({
      items: [{ id: 4, artisan_listing_id: 121, user_id: 10, is_available: true, listing: null }],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    });
  });
});
