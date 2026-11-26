import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../../core/interceptors/auth.interceptor';
import {
  ArtisanProductImage,
  ShowcaseItemPagination,
  ShowcaseItemResponse,
  ShowcaseItemSummary,
} from '../models/artisan.models';
import { resolveArtisanMediaUrl } from './artisan.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;
  private readonly showcaseUrl = `${environment.apiBaseUrl}/showcase-items`;

  getProducts(filters: {
    search?: string | null;
    item_type?: 'product' | 'service';
    category?: string | null;
    artisan_listing_id?: number | null;
    page?: number;
    page_size?: number;
  } = {}): Observable<ShowcaseItemPagination> {
    let params = new HttpParams()
      .set('page', String(Math.max(1, filters.page ?? 1)))
      .set('page_size', String(Math.min(100, Math.max(1, filters.page_size ?? 20))));

    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.item_type) {
      params = params.set('item_type', filters.item_type);
    }
    if (filters.category && filters.category.trim()) {
      params = params.set('category', filters.category.trim());
    }
    if (filters.artisan_listing_id && filters.artisan_listing_id > 0) {
      params = params.set('artisan_listing_id', String(filters.artisan_listing_id));
    }

    return this.http
      .get<ShowcaseItemPagination>(this.showcaseUrl, {
        params,
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(map((res) => this.normalizePage(res, filters.page ?? 1, filters.page_size ?? 20)));
  }

  /**
   * Fetches published showcase products for a specific artisan listing.
   * Endpoint: GET /api/v1/artisan-listings/{listing_id}/showcase-items
   */
  getProductsByListing(
    listingId: number,
    page: number = 1,
    pageSize: number = 20,
    _fallbackImage?: string | null,
    _listingPrice?: number | null,
  ): Observable<ShowcaseItemPagination> {
    const params = new HttpParams()
      .set('page', String(Math.max(1, page)))
      .set('page_size', String(Math.min(100, Math.max(1, pageSize))));

    return this.http
      .get<ShowcaseItemPagination>(`${this.listingsUrl}/${listingId}/showcase-items`, {
        params,
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(
        map((res) => this.normalizePage(res, page, pageSize)),
        catchError(() =>
          of({ items: [], total: 0, page, page_size: pageSize, total_pages: 1 }),
        ),
      );
  }

  getProductById(id: number): Observable<ShowcaseItemResponse> {
    return this.http
      .get<ShowcaseItemResponse>(`${this.showcaseUrl}/${id}`, {
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(map((item) => this.normalizeProduct(item)));
  }

  getProductImages(itemId: number): Observable<ArtisanProductImage[]> {
    return this.http
      .get<ArtisanProductImage[]>(`${this.showcaseUrl}/${itemId}/images`, {
        context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
      })
      .pipe(
        map((imgs) =>
          (Array.isArray(imgs) ? imgs : [])
            .map((img) => ({
              ...img,
              image_url: resolveArtisanMediaUrl(img.image_url) || '',
            }))
            .filter((img) => !!img.image_url),
        ),
        catchError(() => of([] as ArtisanProductImage[])),
      );
  }

  private normalizePage(res: ShowcaseItemPagination, page: number, pageSize: number): ShowcaseItemPagination {
    const items: ShowcaseItemSummary[] = (Array.isArray(res?.items) ? res.items : []).map((item) => ({
      ...item,
      price: item.price != null && Number.isFinite(Number(item.price)) ? Number(item.price) : null,
      currency: item.currency || 'LKR',
      image_url: resolveArtisanMediaUrl(item.image_url),
    }));
    return {
      items,
      total: res?.total ?? items.length,
      page: res?.page ?? page,
      page_size: res?.page_size ?? pageSize,
      total_pages: res?.total_pages ?? Math.max(1, Math.ceil((res?.total ?? items.length) / pageSize)),
    };
  }

  private normalizeProduct(item: ShowcaseItemResponse): ShowcaseItemResponse {
    const rawImages = item.images?.length ? item.images : (item.product_images ?? []);
    const images: ArtisanProductImage[] = rawImages
      .map((img) => ({
        ...img,
        image_url: resolveArtisanMediaUrl(img.image_url) || '',
      }))
      .filter((img) => !!img.image_url);

    return {
      ...item,
      price: item.price != null && Number.isFinite(Number(item.price)) ? Number(item.price) : null,
      currency: item.currency || 'LKR',
      image_url: resolveArtisanMediaUrl(item.image_url) ?? images[0]?.image_url ?? null,
      images,
      product_images: images,
    };
  }
}
