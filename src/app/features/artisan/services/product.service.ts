import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ArtisanProductImage,
  ShowcaseItemPagination,
  ShowcaseItemResponse,
} from '../models/artisan.models';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/showcase-items`;
  private readonly listingsUrl = `${environment.apiBaseUrl}/artisan-listings`;

  /**
   * Browse published showcase items/products with filters.
   */
  getProducts(filters: {
    search?: string | null;
    item_type?: 'product' | 'service';
    artisan_listing_id?: number | null;
    page?: number;
    page_size?: number;
  } = {}): Observable<ShowcaseItemPagination> {
    let params = new HttpParams();

    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.item_type) {
      params = params.set('item_type', filters.item_type);
    }
    if (filters.artisan_listing_id) {
      params = params.set('artisan_listing_id', String(filters.artisan_listing_id));
    }
    if (filters.page) {
      params = params.set('page', String(filters.page));
    }
    if (filters.page_size) {
      params = params.set('page_size', String(filters.page_size));
    }

    return this.http.get<ShowcaseItemPagination>(this.baseUrl, { params });
  }

  /**
   * Retrieve all showcase products of a specific artisan listing.
   */
  getProductsByListing(
    listingId: number,
    page: number = 1,
    pageSize: number = 20
  ): Observable<ShowcaseItemPagination> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));

    return this.http.get<ShowcaseItemPagination>(
      `${this.listingsUrl}/${listingId}/showcase-items`,
      { params }
    );
  }

  /**
   * Retrieve full details of a specific showcase item.
   */
  getProductById(id: number): Observable<ShowcaseItemResponse> {
    return this.http.get<ShowcaseItemResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Retrieve gallery photos for a product.
   */
  getProductImages(itemId: number): Observable<ArtisanProductImage[]> {
    return this.http.get<ArtisanProductImage[]>(`${this.baseUrl}/${itemId}/images`);
  }
}
