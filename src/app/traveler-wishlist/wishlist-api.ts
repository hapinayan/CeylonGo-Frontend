import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { HomestayDetails, HomestayPage } from '../core/models/homestay.models';
import { ActivityDetails } from '../experiences/models/activity';
import { TravelApi } from '../experiences/services/travel-api';
import { RentalApi, SavedRental } from '../bike-rentals/rental-api';
import { ArtisanWishlistItemResponse } from '../features/artisan/models/artisan.models';
import { FavoriteService } from '../features/artisan/services/favorite.service';
import { SavedListing, WishlistKind, listingLocation } from './wishlist-model';

interface Page<T> { items: T[]; page: number; total: number; page_size: number; total_pages?: number }

export interface SavedHomestay {
  saved_at: string;
  homestay: {
    id: number;
    name: string;
    location: string;
    price_per_night: string | number;
    images: { image_url: string; is_primary: boolean }[];
    is_active: boolean;
    approval_status: string;
  };
}

export interface GuideWishlistItem {
  listing: {
    id: number;
    title: string;
    locality?: string | null;
    district?: string | null;
    price?: string | number | null;
    currency?: string;
    is_active?: boolean;
    approval_status?: string;
    media?: Array<{ image_url?: string | null; storage_key?: string | null }>;
  };
  provider_name?: string;
}

export interface GuideWishlistPage {
  items: GuideWishlistItem[];
  next_offset: number | null;
}

const price = (value: number | string | null | undefined) =>
  value == null || value === '' || !Number.isFinite(Number(value)) ? undefined : Number(value);

export const adaptWishlist = {
  homestay: (row: HomestayDetails | SavedHomestay): SavedListing => {
    if ('homestay' in row) {
      const h = row.homestay;
      return {
        kind: 'homestay',
        id: h.id,
        title: h.name,
        location: h.location,
        savedAt: row.saved_at,
        image: (h.images.find(i => i.is_primary) ?? h.images[0])?.image_url,
        price: price(h.price_per_night),
        currency: 'LKR',
        unit: 'night',
        detail: h.is_active && h.approval_status === 'approved' ? ['/homestays', h.id] : undefined,
      };
    }

    const firstImage = row.media?.[0]?.image_url ?? row.media?.[0]?.storage_key ?? undefined;
    return {
      kind: 'homestay',
      id: row.id,
      title: row.title,
      location: listingLocation(row.locality, row.district),
      savedAt: row.created_at || '',
      image: firstImage,
      price: price(row.price),
      currency: row.currency || 'LKR',
      unit: 'night',
      detail: row.is_active && row.approval_status === 'approved' ? ['/homestays', row.id] : undefined,
    };
  },
  activity: (row: ActivityDetails): SavedListing => ({
    kind: 'eco',
    id: row.id,
    title: row.title,
    savedAt: '',
    location: listingLocation(row.locality, row.district),
    image: row.photos?.[0]?.image_url,
    price: price(row.price_per_participant),
    currency: row.currency,
    unit: 'person',
    detail: ['/experiences', row.id],
  }),
  guide: (row: GuideWishlistItem): SavedListing => {
    const l = row.listing;
    const firstImage = l.media?.[0]?.image_url ?? l.media?.[0]?.storage_key ?? undefined;
    return {
      kind: 'guide',
      id: l.id,
      title: l.title || row.provider_name || 'Tour Guide #' + l.id,
      savedAt: '',
      location: listingLocation(l.locality, l.district),
      image: firstImage,
      price: price(l.price),
      currency: l.currency || 'LKR',
      unit: 'day',
      detail: l.is_active && l.approval_status === 'approved' ? ['/tour-guides', l.id] : undefined,
    };
  },
  rental: (row: SavedRental): SavedListing => {
    const id = row.id ?? row.vehicle_id ?? 0;
    const isAvailable = row.is_available ?? (row.status ? row.status === 'available' : true);
    return {
      kind: 'rental',
      id,
      title: row.vehicle_name,
      savedAt: row.saved_at ?? row.created_at ?? '',
      location: listingLocation(row.location_name, row.city, row.district),
      image: row.primary_image_url,
      price: price(row.price_per_day),
      currency: row.currency,
      unit: 'day',
      detail: isAvailable ? ['/bicycles', id] : undefined,
    };
  },
  artisan: (row: ArtisanWishlistItemResponse): SavedListing => {
    const l = row.listing;
    return {
      kind: 'artisan',
      id: row.artisan_listing_id,
      title: l?.title ?? 'Artisan Business #' + row.artisan_listing_id,
      savedAt: row.created_at ?? '',
      location: listingLocation(l?.city, l?.district),
      image: l?.cover_image_url ?? undefined,
      price: price(l?.price),
      currency: l?.currency || 'LKR',
      unit: 'starting',
      rating: l?.average_rating ?? null,
      reviews: l?.total_reviews ?? undefined,
      detail: row.is_available ? ['/artisans', row.artisan_listing_id] : undefined,
    };
  },
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
  private readonly artisanFavorites = inject(FavoriteService);
  private readonly base = environment.apiBaseUrl;
  readonly homestayRevision = signal(0);

  list(kind: WishlistKind): Observable<SavedListing[]> {
    switch (kind) {
      case 'homestay':
        return this.homestays().pipe(
          expand(page => page.next_before_id != null ? this.homestays(page.next_before_id) : EMPTY),
          reduce((items, page) => { items.push(...(page.items ?? [])); return items; }, [] as HomestayDetails[]),
          map(rows => rows.map(adaptWishlist.homestay)),
        );
      case 'eco':
        return this.travel.saved(50, 0).pipe(
          expand(page => page.next_offset != null ? this.travel.saved(50, page.next_offset) : EMPTY),
          reduce((items, page) => { items.push(...(page.items ?? [])); return items; }, [] as ActivityDetails[]),
          map(rows => rows.map(adaptWishlist.activity)),
        );
      case 'guide':
        return this.guides(0).pipe(
          expand(page => page.next_offset != null ? this.guides(page.next_offset) : EMPTY),
          reduce((items, page) => { items.push(...(page.items ?? [])); return items; }, [] as GuideWishlistItem[]),
          map(rows => rows.map(adaptWishlist.guide)),
        );
      case 'rental':
        return allPages(page => this.rental.savedList(page, 50)).pipe(
          map(rows => rows.map(adaptWishlist.rental)),
        );
      case 'artisan':
        return allPages(page => this.artisanFavorites.getBusinessWishlist(page, 50)).pipe(
          map(rows => rows.map(adaptWishlist.artisan)),
        );
    }
  }

  homestays(beforeId?: number): Observable<HomestayPage> {
    let params = new HttpParams().set('limit', '20');
    if (beforeId != null) params = params.set('before_id', String(beforeId));
    return this.http.get<HomestayPage>(this.base + '/homestays/wishlist', { params });
  }

  guides(offset = 0): Observable<GuideWishlistPage> {
    const params = new HttpParams().set('limit', '50').set('offset', String(offset));
    return this.http.get<GuideWishlistPage>(this.base + '/tour-guides/wishlist', { params });
  }

  setHomestay(id: number, saved: boolean): Observable<unknown> {
    const url = this.base + '/homestays/' + id + '/wishlist';
    return (saved ? this.http.put(url, {}) : this.http.delete(url)).pipe(
      tap(() => this.homestayRevision.update(value => value + 1)),
    );
  }

  remove(item: SavedListing): Observable<unknown> {
    switch (item.kind) {
      case 'homestay': return this.setHomestay(item.id, false);
      case 'eco': return this.travel.unsave(item.id);
      case 'guide': return this.http.delete(this.base + '/tour-guides/' + item.id + '/wishlist');
      case 'rental': return this.rental.toggleSaved(item.id, true);
      case 'artisan': return this.artisanFavorites.removeSavedBusiness(item.id);
    }
  }
}
