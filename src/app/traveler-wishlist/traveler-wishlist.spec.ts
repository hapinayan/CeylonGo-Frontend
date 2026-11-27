import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../core/services/auth.service';
import { TravelSession } from '../experiences/services/travel-session';
import { environment } from '../../environments/environment';
import { listingKey, displayListings, SavedListing, WishlistKind } from './wishlist-model';
import { adaptWishlist, TravelerWishlistApi } from './wishlist-api';
import { travelerWishlistRoutes } from './wishlist.routes';

@Component({ template: '<p>Auth stub</p>' })
class AuthStub {}

const stay: SavedListing = {
  kind: 'homestay',
  id: 1,
  title: 'Test Ella Stay',
  location: 'Ella',
  savedAt: '2026-01-02',
  currency: 'LKR',
  price: 4000,
  detail: ['/homestays', 1],
};
const guide: SavedListing = {
  kind: 'guide',
  id: 7,
  title: 'Nadee Fernando',
  location: 'Ella, Badulla',
  savedAt: '',
  currency: 'LKR',
  price: 7500,
  detail: ['/tour-guides', 7],
};
const rental: SavedListing = {
  kind: 'rental',
  id: 1,
  title: 'Test Bicycle',
  location: 'Galle',
  savedAt: '2026-01-01',
  currency: 'LKR',
  price: 2200,
};

describe('Traveler Wishlist', () => {
  it('uses distinct keys and combines normalized search, category, and sort', () => {
    expect(listingKey(stay)).not.toBe(listingKey(rental));
    expect(displayListings([stay, rental, stay], 'all', '', 'price')).toEqual([rental, stay]);
    expect(displayListings([rental, stay], 'homestay', '  ELLA   stay  ', 'name')).toEqual([stay]);
    expect(displayListings([rental, stay, guide], 'guide', 'nadee', 'recent')).toEqual([guide]);
  });

  it('maps fields accurately from Academic MVP Homestay, Guide, and Rental wishlist contracts', () => {
    const mappedStay = adaptWishlist.homestay({
      id: 1,
      provider_id: 2,
      category: 'homestay',
      title: 'Test Ella Stay',
      description: 'Cozy stay',
      district: 'Badulla',
      locality: 'Ella',
      latitude: null,
      longitude: null,
      price: '4000.00',
      currency: 'LKR',
      approval_status: 'approved',
      is_active: false,
      media: [],
      units: [],
      created_at: '2026-01-02T00:00:00Z',
      property_type: 'villa',
      amenities: [],
      host: { id: 2, business_name: 'Host' },
    });
    expect(mappedStay).toMatchObject({ id: 1, title: 'Test Ella Stay', price: 4000, unit: 'night' });
    expect(mappedStay.detail).toBeUndefined();

    const mappedGuide = adaptWishlist.guide({
      listing: {
        id: 7,
        title: 'Nadee Fernando',
        locality: 'Ella',
        district: 'Badulla',
        price: '7500',
        currency: 'LKR',
        is_active: true,
        approval_status: 'approved',
        media: [{ image_url: '/images/traveler-home/find-tour-guide.webp' }],
      },
      provider_name: 'Nadee',
    });
    expect(mappedGuide).toMatchObject({ kind: 'guide', id: 7, title: 'Nadee Fernando', price: 7500, detail: ['/tour-guides', 7] });

    const mappedRental = adaptWishlist.rental({
      id: 9,
      vehicle_name: 'Coastal Scooter',
      vehicle_type: 'bike',
      city: 'Galle',
      district: 'Galle',
      location_name: 'Fort',
      primary_image_url: null,
      price_per_day: '2500',
      currency: 'LKR',
      status: 'available',
    });
    expect(mappedRental).toMatchObject({ kind: 'rental', id: 9, title: 'Coastal Scooter', price: 2500, detail: ['/bicycles', 9] });

    const mappedArtisan = adaptWishlist.artisan({
      id: 14,
      artisan_listing_id: 121,
      user_id: 10,
      is_available: true,
      listing: {
        id: 121,
        provider_profile_id: 9,
        title: 'Vavuniya Clay Studio',
        craft_category: 'Pottery & Ceramics',
        district: 'Vavuniya',
        city: 'Vavuniya',
        price: 2200,
        currency: 'LKR',
        cover_image_url: '/api/v1/listings/121/photos/120',
        approval_status: 'approved',
        is_active: true,
        average_rating: null,
        total_reviews: 0,
      },
    });
    expect(mappedArtisan).toMatchObject({ kind: 'artisan', id: 121, title: 'Vavuniya Clay Studio', price: 2200, detail: ['/artisans', 121] });
  });

  it('uses cursor pagination on /homestays/wishlist and removes items via MVP wishlist endpoints', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(TravelerWishlistApi);
    const http = TestBed.inject(HttpTestingController);
    const homestayBase = environment.apiBaseUrl + '/homestays';
    const guideBase = environment.apiBaseUrl + '/tour-guides';
    const artisanBase = environment.apiBaseUrl + '/artisan-listings';

    const read = vi.fn();
    api.list('homestay').subscribe(read);
    http.expectOne(r => r.url === homestayBase + '/wishlist' && !r.params.has('before_id'))
      .flush({ items: [], next_before_id: 42 });
    http.expectOne(r => r.url === homestayBase + '/wishlist' && r.params.get('before_id') === '42')
      .flush({ items: [], next_before_id: null });
    expect(read).toHaveBeenCalledWith([]);

    api.remove(stay).subscribe();
    http.expectOne({ method: 'DELETE', url: homestayBase + '/1/wishlist' }).flush({ listing_id: 1, saved: false });

    api.remove(guide).subscribe();
    http.expectOne({ method: 'DELETE', url: guideBase + '/7/wishlist' }).flush({ listing_id: 7, saved: false });
    void artisanBase;
    http.verify();
  });

  function setup(signedIn: boolean) {
    const owner = signal<{ id: number } | null>(signedIn ? { id: 1 } : null);
    const remove = new Subject<void>();
    let rentalFails = true;
    const list = vi.fn((kind: WishlistKind) => {
      if (kind === 'rental' && rentalFails) {
        rentalFails = false;
        return throwError(() => new Error('Unavailable'));
      }
      return of(kind === 'homestay' ? [stay] : kind === 'guide' ? [guide] : kind === 'rental' ? [rental] : []);
    });
    const api = { list, remove: vi.fn(() => remove) };
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      provideRouter([{ path: 'auth', component: AuthStub }, { path: 'wishlist', children: travelerWishlistRoutes }]),
      { provide: AuthService, useValue: { currentUser: () => owner() ? { id: owner()!.id, role: 'traveler', is_active: true, full_name: 'Synthetic Tester' } : null, isAuthenticated: () => !!owner() } },
      { provide: TravelSession, useValue: { account: owner } },
      { provide: TravelerWishlistApi, useValue: api },
    ] });
    return { owner, api, remove };
  }

  it('keeps successful sources on partial failure, retries one source, and deduplicates pending removal', async () => {
    const { api, remove } = setup(true);
    const harness = await RouterTestingHarness.create('/wishlist');
    const find = (label: string) => [...harness.routeNativeElement!.querySelectorAll('button')]
      .find(node => node.textContent?.includes(label))!;
    expect(harness.routeNativeElement!.textContent).toContain(stay.title);
    expect(harness.routeNativeElement!.textContent).toContain(guide.title);
    find('Retry Rentals').click();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain(rental.title);
    expect(api.list.mock.calls.filter(([kind]) => kind === 'rental')).toHaveLength(2);
    find('Remove').click();
    find('Remove').click();
    expect(api.remove).toHaveBeenCalledTimes(1);
    remove.next();
    expect(api.list.mock.calls.filter(([kind]) => kind === 'homestay')).toHaveLength(2);
  });

  it('redirects a guest on the non-preview route', async () => {
    const { api } = setup(false);
    await RouterTestingHarness.create('/wishlist');
    expect(TestBed.inject(Router).url).toMatch(/^\/auth\?returnUrl=/);
    expect(api.list).not.toHaveBeenCalled();
  });

  it('cancels a pending mutation and hides prior items immediately after sign-out', async () => {
    const { owner, api, remove } = setup(true);
    const harness = await RouterTestingHarness.create('/wishlist');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.remove')!.click();
    owner.set(null);
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).not.toContain(stay.title);
    const oldCalls = api.list.mock.calls.length;
    remove.next();
    expect(api.list.mock.calls.length).toBe(oldCalls);
  });
});
