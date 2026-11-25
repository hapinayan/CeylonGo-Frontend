import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ArtisanReviewPaginationResponse,
  ArtisanReviewSummaryResponse,
} from '../models/artisan.models';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/artisan-listings`;

  /**
   * Retrieve reviews for an artisan listing.
   */
  getListingReviews(
    listingId: number,
    page: number = 1,
    pageSize: number = 10
  ): Observable<ArtisanReviewPaginationResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));

    return this.http
      .get<ArtisanReviewPaginationResponse>(`${this.baseUrl}/${listingId}/reviews`, { params })
      .pipe(
        catchError(() =>
          of({
            items: [],
            total: 0,
            page: 1,
            page_size: pageSize,
            total_pages: 0,
            average_rating: 0,
            total_reviews: 0,
          })
        )
      );
  }

  /**
   * Retrieve aggregated rating and review metrics for an artisan listing.
   */
  getListingReviewSummary(listingId: number): Observable<ArtisanReviewSummaryResponse> {
    return this.http
      .get<ArtisanReviewSummaryResponse>(`${this.baseUrl}/${listingId}/reviews/summary`)
      .pipe(
        catchError(() =>
          of({
            listing_id: listingId,
            listing_title: '',
            average_rating: 0,
            total_reviews: 0,
            rating_breakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
            verified_reviews_count: 0,
          })
        )
      );
  }

  getReviewSummary(listingId: number): Observable<ArtisanReviewSummaryResponse> {
    return this.getListingReviewSummary(listingId);
  }
}
