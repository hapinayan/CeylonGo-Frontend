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
import { FavoriteService } from '../features/artisan/services/favorite.service';
import { environment } from '../../environments/environment';
import { listingKey, displayListings, SavedListing, WishlistKind } from './wishlist-model';
import { adaptWishlist, TravelerWishlistApi } from './wishlist-api';
import { travelerWishlistRoutes } from './wishlist.routes';

@Component({ template: '<p>Auth stub</p>' })
class AuthStub {}

const stay: SavedListing = { kind: 'homestay', id: 1, title: 'Test Ella Stay', location: 'Ella',
  savedAt: '2026-01-02', currency: 'LKR', price: 4000, detail: ['/homestays', 1] };
const rental: SavedListing = { kind: 'rental', id: 1, title: 'Test Bicycle', location: 'Galle',
  savedAt: '2026-01-01', currency: 'LKR', price: 2200 };

describe('Traveler Wishlist', () => {
  it('uses distinct keys and combines normalized search, category, and sort', () => {
    expect(listingKey(stay)).not.toBe(listingKey(rental));
    expect(displayListings([stay, rental, stay], 'all', '', 'price')).toEqual([rental, stay]);
    expect(displayListings([rental, stay], 'homestay', '  ELLA   stay  ', 'name')).toEqual([stay]);
  });

  it('maps only fields from the service contract', () => {
    const mapped = adaptWishlist.homestay({ saved_at: '2026-01-02',
      homestay: { id: 1, name: 'Test Ella Stay', location: 'Ella', price_per_night: '4000',
        images: [], is_active: false, approval_status: 'approved' } });
    expect(mapped).toMatchObject({ id: 1, title: 'Test Ella Stay', price: 4000, unit: 'night' });
    expect(mapped.detail).toBeUndefined();
    expect(mapped.rating).toBeUndefined();
  });

  it('uses verified pages in order and performs the exact homestay remove request', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: FavoriteService, useValue: {} }] });
    const api = TestBed.inject(TravelerWishlistApi);
    const http = TestBed.inject(HttpTestingController);
    const base = environment.apiBaseUrl + '/wishlists/homestays';
    const read = vi.fn();
    api.list('homestay').subscribe(read);
    const page = (n: number) => http.expectOne(r => r.url === base && r.params.get('page') === String(n));
    page(1).flush({ items: [], page: 1, page_size: 50, total: 51 });
    page(2).flush({ items: [], page: 2, page_size: 50, total: 51 });
    expect(read).toHaveBeenCalledWith([]);
    api.remove(stay).subscribe();
    http.expectOne({ method: 'DELETE', url: base + '/1' }).flush(null);
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
      return of(kind === 'homestay' ? [stay] : kind === 'rental' ? [rental] : []);
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
    find('Retry Bike Rental').click();
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
