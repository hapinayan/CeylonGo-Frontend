import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ArtisanBusinessHours,
  ArtisanFilterParams,
  ArtisanListingPagination,
  ArtisanListingResponse,
} from '../models/artisan.models';

@Injectable({
  providedIn: 'root',
})
export class ArtisanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/artisan-listings`;

  /**
   * Browse active and approved artisan listings with search, district, category, and pagination.
   */
  getListings(filters: ArtisanFilterParams = {}): Observable<ArtisanListingPagination> {
    let params = new HttpParams();

    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.district && filters.district.trim()) {
      params = params.set('district', filters.district.trim());
    }
    if (filters.category && filters.category.trim()) {
      params = params.set('category', filters.category.trim());
    }
    if (filters.is_featured !== undefined && filters.is_featured !== null) {
      params = params.set('is_featured', String(filters.is_featured));
    }
    if (filters.page) {
      params = params.set('page', String(filters.page));
    }
    if (filters.page_size) {
      params = params.set('page_size', String(filters.page_size));
    }

    return this.http.get<ArtisanListingPagination>(this.baseUrl, { params }).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Get list of unique craft categories from backend.
   */
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/categories`).pipe(
      catchError(() => {
        // Fallback to verified craft categories if endpoint fails
        return [
          [
            'Handicrafts',
            'Pottery & Ceramics',
            'Batik & Textiles',
            'Woodcarving & Masks',
            'Jewelry & Gem Craft',
            'Brass & Metalware',
            'Handmade & Weaving',
            'Spices & Herbal Products',
            'Local Products',
          ],
        ];
      })
    );
  }

  /**
   * Get list of unique active districts in Sri Lanka with registered artisan listings.
   */
  getDistricts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/districts`).pipe(
      catchError(() => {
        return [
          [
            'Colombo',
            'Kandy',
            'Galle',
            'Matara',
            'Matale',
            'Jaffna',
            'Batticaloa',
            'Kurunegala',
            'Anuradhapura',
          ],
        ];
      })
    );
  }

  /**
   * Get full public details of a single artisan listing by ID.
   */
  getListingById(id: number): Observable<ArtisanListingResponse> {
    return this.http.get<ArtisanListingResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get structured business opening hours for a listing.
   */
  getBusinessHours(listingId: number): Observable<ArtisanBusinessHours[]> {
    return this.http
      .get<ArtisanBusinessHours[]>(`${this.baseUrl}/${listingId}/business-hours`)
      .pipe(
        catchError(() => {
          return [[]];
        })
      );
  }
}
