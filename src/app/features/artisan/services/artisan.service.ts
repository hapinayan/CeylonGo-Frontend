import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../../core/interceptors/auth.interceptor';
import {
  ArtisanBusinessHours,
  ArtisanBusinessImage,
  ArtisanFilterParams,
  ArtisanListingPagination,
  ArtisanListingResponse,
  ArtisanListingSummary,
} from '../models/artisan.models';

export const CANONICAL_ARTISAN_CATEGORIES: readonly string[] = [
  'Handicrafts',
  'Pottery & Ceramics',
  'Batik & Textiles',
  'Handmade & Weaving',
  'Jewellery & Gem Craft',
  'Woodcarving & Masks',
  'Local Products',
  'Spices & Herbal Products',
];

export interface SharedBackendMedia {
  id: number;
  storage_key?: string;
  sort_order?: number;
  alt_text?: string | null;
  image_url?: string | null;
}

export interface SharedBackendUnit {
  id: number;
  listing_id?: number;
  label: string;
  capacity: number;
  is_active: boolean;
  notes?: string | null;
}

export interface SharedBackendListing {
  id: number;
  provider_id: number;
  category: string;
  title: string;
  description: string | null;
  district: string;
  locality: string;
  latitude: string | number | null;
  longitude: string | number | null;
  price: string | number | null;
  currency?: string;
  approval_status: string;
  is_active: boolean;
  media?: SharedBackendMedia[];
  units?: SharedBackendUnit[];
  created_at?: string;
}

export function resolveArtisanMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  try {
    const baseOrigin = new URL(environment.apiBaseUrl).origin;
    const resolved = new URL(value, baseOrigin);
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.href : null;
  } catch {
    return value;
  }
}

export function inferArtisanCategory(title: string, description?: string | null): string {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  if (/pottery|ceramic|clay|terracotta|earthenware|planter|bowl|pot\b/.test(text)) return 'Pottery & Ceramics';
  if (/batik|textile|silk|sarong|dye/.test(text)) return 'Batik & Textiles';
  if (/weav|handloom|cane|reed|palmyra|basket|mat\b|dumbara/.test(text)) return 'Handmade & Weaving';
  if (/jewel|gem|sapphire|silver|filigree|brass|copper|metal/.test(text)) return 'Jewellery & Gem Craft';
  if (/wood|carv|mask|raksha|lacquer|ebony/.test(text)) return 'Woodcarving & Masks';
  if (/spice|cinnamon|herbal|ayurved|oil|tea|pepper/.test(text)) return 'Spices & Herbal Products';
  if (/local product|honey|jaggery|treacle|coconut/.test(text)) return 'Local Products';
  return 'Handicrafts';
}

@Injectable({
  providedIn: 'root',
})
export class ArtisanService {
  private readonly http = inject(HttpClient);
  private readonly listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;

  /**
   * Fetches approved and active Artisan listings from dedicated GET /api/v1/artisan-listings.
   */
  getListings(filters: ArtisanFilterParams = {}): Observable<ArtisanListingPagination> {
    let params = new HttpParams()
      .set('page', String(Math.max(1, filters.page ?? 1)))
      .set('page_size', String(Math.min(100, Math.max(1, filters.page_size ?? 20))));

    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.category && filters.category.trim()) {
      params = params.set('category', filters.category.trim());
    }
    if (filters.district && filters.district.trim()) {
      params = params.set('district', filters.district.trim());
    }
    if (filters.business_type && filters.business_type.trim()) {
      params = params.set('business_type', filters.business_type.trim());
    }
    if (filters.min_price != null && Number.isFinite(Number(filters.min_price))) {
      params = params.set('min_price', String(filters.min_price));
    }
    if (filters.max_price != null && Number.isFinite(Number(filters.max_price))) {
      params = params.set('max_price', String(filters.max_price));
    }
    const sortBy = (filters.sort_by || filters.sort)?.trim();
    if (sortBy) {
      params = params.set('sort_by', sortBy);
    }
    if (filters.is_featured !== null && filters.is_featured !== undefined) {
      params = params.set('is_featured', String(filters.is_featured));
    }

    return this.http
      .get<ArtisanListingPagination>(this.listingsUrl, {
        params,
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(
        map((res) => ({
          items: Array.isArray(res?.items) ? res.items.map((item) => this.normalizeSummary(item)) : [],
          total: res?.total ?? 0,
          page: res?.page ?? filters.page ?? 1,
          page_size: res?.page_size ?? filters.page_size ?? 20,
          total_pages: res?.total_pages ?? 1,
        })),
        catchError((error) => throwError(() => error)),
      );
  }

  getCategories(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.listingsUrl}/categories`, {
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(
        map((items) => (Array.isArray(items) ? items : [])),
        catchError(() => of([...CANONICAL_ARTISAN_CATEGORIES])),
      );
  }

  getDistricts(): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.listingsUrl}/districts`, {
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(map((items) => (Array.isArray(items) ? items : [])));
  }

  getListingById(id: number): Observable<ArtisanListingResponse> {
    return this.http
      .get<ArtisanListingResponse>(`${this.listingsUrl}/${id}`, {
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(map((row) => this.normalizeDetail(row)));
  }

  getBusinessHours(listingId: number): Observable<ArtisanBusinessHours[]> {
    return this.http
      .get<ArtisanBusinessHours[]>(`${this.listingsUrl}/${listingId}/business-hours`, {
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(
        map((rows) => (Array.isArray(rows) ? [...rows].sort((a, b) => a.day_of_week - b.day_of_week) : [])),
        catchError(() => of([] as ArtisanBusinessHours[])),
      );
  }

  private normalizeSummary(item: ArtisanListingSummary): ArtisanListingSummary {
    return {
      ...item,
      cover_image_url: resolveArtisanMediaUrl(item.cover_image_url),
      price: item.price != null && Number.isFinite(Number(item.price)) ? Number(item.price) : null,
      currency: item.currency || 'LKR',
    };
  }

  private normalizeDetail(row: ArtisanListingResponse): ArtisanListingResponse {
    const rawImages = row.business_images?.length ? row.business_images : (row.images ?? []);
    const images: ArtisanBusinessImage[] = rawImages
      .map((img) => ({
        ...img,
        image_url: resolveArtisanMediaUrl(img.image_url) || '',
      }))
      .filter((img) => !!img.image_url);

    const coverUrl = resolveArtisanMediaUrl(row.cover_image_url) ?? images[0]?.image_url ?? null;

    return {
      ...row,
      cover_image_url: coverUrl,
      price: row.price != null && Number.isFinite(Number(row.price)) ? Number(row.price) : null,
      currency: row.currency || 'LKR',
      latitude: row.latitude != null && Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
      longitude: row.longitude != null && Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
      images,
      business_images: images,
      business_hours: Array.isArray(row.business_hours)
        ? [...row.business_hours].sort((a, b) => a.day_of_week - b.day_of_week)
        : [],
    };
  }
}
