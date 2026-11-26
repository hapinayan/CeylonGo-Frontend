import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
  ArtisanReviewPaginationResponse,
  ArtisanReviewSummaryResponse,
} from '../models/artisan.models';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  /**
   * Dedicated Artisan review endpoints are not yet exposed on current Academic MVP OpenAPI;
   * returns an honest empty result without network 404s or fabricated reviews.
   */
  getListingReviews(
    _listingId: number,
    page: number = 1,
    pageSize: number = 10
  ): Observable<ArtisanReviewPaginationResponse> {
    return of({
      items: [],
      total: 0,
      page,
      page_size: pageSize,
      total_pages: 0,
      average_rating: 0,
      total_reviews: 0,
    });
  }

  getListingReviewSummary(listingId: number): Observable<ArtisanReviewSummaryResponse> {
    return of({
      listing_id: listingId,
      listing_title: '',
      average_rating: 0,
      total_reviews: 0,
      rating_breakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
      verified_reviews_count: 0,
    });
  }

  getReviewSummary(listingId: number): Observable<ArtisanReviewSummaryResponse> {
    return this.getListingReviewSummary(listingId);
  }
}
