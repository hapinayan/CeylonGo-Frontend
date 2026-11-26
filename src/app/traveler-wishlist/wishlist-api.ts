import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, inject, signal } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TravelApi } from '../experiences/services/travel-api';
import { RentalApi, SavedRental } from '../bike-rentals/rental-api';
import { FavoriteService } from '../features/artisan/services/favorite.service';
import { SavedItem } from '../experiences/models/travel';
import { ArtisanFavoriteResponse, ArtisanWishlistItemResponse } from '../features/artisan/models/artisan.models';
import { SavedListing, WishlistKind, listingLocation } from './wishlist-model';

interface Page<T> { items: T[]; page: number; total: number; page_size: number; total_pages?: number }
export interface SavedHomestay {
  saved_at: string;
  homestay: { id: number; name: string; location: string; price_per_night: string | number;
    images: { image_url: string; is_primary: boolean }[]; is_active: boolean; approval_status: string };
}

const price = (value: number | string | null | undefined) =>
  value == null || value === '' || !Number.isFinite(Number(value)) ? undefined : Number(value);

export const adaptWishlist = {
  homestay: ({ saved_at, homestay: h }: SavedHomestay): SavedListing => ({
    kind: 'homestay', id: h.id, title: h.name, location: h.location, savedAt: saved_at,
    image: (h.images.find(i => i.is_primary) ?? h.images[0])?.image_url,
    price: price(h.price_per_night), currency: 'LKR', unit: 'night',
    detail: h.is_active && h.approval_status === 'approved' ? ['/homestays', h.id] : undefined,
  }),
  eco: (row: SavedItem): SavedListing => ({
    kind: 'eco', id: row.eco_experience_id, title: row.experience?.title ?? 'Unavailable experience',
    savedAt: row.created_at, location: listingLocation(row.experience?.city, row.experience?.district),
    price: price(row.experience?.base_price), currency: row.experience?.currency,
    unit: row.experience?.pricing_type.replaceAll('_', ' '),
    detail: row.is_available ? ['/experiences', row.eco_experience_id] : undefined,
  }),
  rental: (row: SavedRental): SavedListing => ({
    kind: 'rental', id: row.vehicle_id, title: row.vehicle_name, savedAt: row.saved_at,
    location: listingLocation(row.location_name, row.city, row.district), image: row.primary_image_url,
    price: price(row.price_per_day), currency: row.currency, unit: 'day',
    detail: row.is_available ? ['/bicycles', row.vehicle_id] : undefined,
  }),
  business: (row: ArtisanWishlistItemResponse): SavedListing => ({
    kind: 'artisan-business', id: row.artisan_listing_id, title: row.listing?.title ?? 'Unavailable artisan business',
    savedAt: row.created_at, location: listingLocation(row.listing?.city, row.listing?.district),
    image: row.listing?.cover_image_url, rating: row.listing?.average_rating, reviews: row.listing?.total_reviews,
    detail: row.is_available ? ['/artisans', row.artisan_listing_id] : undefined,
  }),
  product: (row: ArtisanFavoriteResponse): SavedListing => ({
    kind: 'artisan-product', id: row.product_id, title: row.product.title, savedAt: row.created_at,
    image: row.product.image_url, price: price(row.product.price), currency: row.product.currency,
    detail: ['/artisans', 'products', row.product_id],
  }),
};

function allPages<T>(read: (page: number) => Observable<Page<T>>): Observable<T[]> {
  return read(1).pipe(
    expand((page, index) => index + 1 === page.page &&
      page.page < (page.total_pages ?? Math.ceil(page.total / page.page_size)) ? read(page.page + 1) : EMPTY),
    reduce((items, page) => { items.push(...page.items); return items; }, [] as T[]),
  );
}

@Injectable({ providedIn: 'root' })
export class TravelerWishlistApi {
  private readonly http = inject(HttpClient);
  private readonly travel = inject(TravelApi);
  private readonly rental = inject(RentalApi);
  private readonly injector = inject(Injector);
  private get artisan() { return this.injector.get(FavoriteService); }
  private readonly base = environment.apiBaseUrl;
  readonly homestayRevision = signal(0);

  list(kind: WishlistKind): Observable<SavedListing[]> {
    switch (kind) {
      case 'homestay': return allPages(page => this.homestays(page)).pipe(map(rows => rows.map(adaptWishlist.homestay)));
      case 'eco': return allPages(page => this.travel.saved(page, 50)).pipe(map(rows => rows.map(adaptWishlist.eco)));
      case 'rental': return allPages(page => this.rental.savedList(page, 50)).pipe(map(rows =>
        rows.filter(row => ['bike', 'bicycle'].includes(row.vehicle_type)).map(adaptWishlist.rental)));
      case 'artisan-business': return allPages(page => this.artisan.getBusinessWishlist(page, 50)).pipe(map(rows => rows.map(adaptWishlist.business)));
      case 'artisan-product': return allPages(page => this.artisan.getProductFavorites(page, 50)).pipe(map(rows => rows.map(adaptWishlist.product)));
    }
  }

  homestays(page: number): Observable<Page<SavedHomestay>> {
    return this.http.get<Page<SavedHomestay>>(this.base + '/wishlists/homestays', { params: { page, page_size: 50 } });
  }

  setHomestay(id: number, saved: boolean): Observable<unknown> {
    const url = this.base + '/wishlists/homestays/' + id;
    return (saved ? this.http.post(url, null) : this.http.delete(url)).pipe(
      tap(() => this.homestayRevision.update(value => value + 1)),
    );
  }

  remove(item: SavedListing): Observable<unknown> {
    switch (item.kind) {
      case 'homestay': return this.setHomestay(item.id, false);
      case 'eco': return this.travel.unsave(item.id);
      case 'rental': return this.rental.toggleSaved(item.id, true);
      case 'artisan-business': return this.artisan.removeSavedBusiness(item.id);
      case 'artisan-product': return this.artisan.removeSavedProduct(item.id);
    }
  }
}
