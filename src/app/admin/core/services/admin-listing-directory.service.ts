import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ListingReview {
  listing: {
    id: number; provider_id: number; category: string; title: string; description: string;
    district: string; locality: string; price: number | string; currency: string; is_active: boolean;
    approval_status: string; created_at: string; updated_at: string; media?: unknown[];
  };
  provider: { id: number; business_name: string; email: string; phone: string; verification_status: string };
  verification_status: string;
  decided_at: string | null;
  decision_reason: string | null;
  details: Record<string, any>;
  homestay_metadata: Record<string, any> | null;
  rooms: { capacity?: number }[];
}

interface ListingDirectoryPage {
  items: ListingReview[]; total: number; page: number; page_size: number; limit: number;
  total_pages: number; counts: Record<string, number>; active: number; providers: number;
}

@Injectable({ providedIn: 'root' })
export class AdminListingDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl + '/admin';

  list<T>(category: string, transform: (review: ListingReview) => T, filters: object = {}) {
    let params = new HttpParams().set('category', category);
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ListingDirectoryPage>(this.base + '/listing-directory', { params })
      .pipe(map((page) => ({ ...page, items: page.items.map(transform) })));
  }

  detail<T>(id: number, transform: (review: ListingReview) => T) {
    return this.http.get<ListingReview>(this.base + '/listings/' + id).pipe(map(transform));
  }

  decide(id: number, approval_status: string, decision_reason?: string) {
    return this.http.post(this.base + '/listings/' + id + '/decision',
      { approval_status, decision_reason });
  }
}

export function listingVerificationStatus(review: ListingReview): 'verified' | 'rejected' | 'pending' | 'unverified' {
  switch (review.verification_status) {
    case 'approved': return 'verified';
    case 'rejected': return 'rejected';
    case 'pending': return 'pending';
    default: return 'unverified';
  }
}
