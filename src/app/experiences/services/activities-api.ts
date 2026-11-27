import { HttpClient, HttpContext, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../core/interceptors/auth.interceptor';
import { generateRequestUuid } from '../../core/utils/uuid.util';
import {
  ActivityBookingCreateRequest,
  ActivityBookingDetailResponse,
  ActivityBookingResponse,
  ActivityBookingStatusUpdateRequest,
  ActivityDetails,
  ActivityDiscoverQuery,
  ActivityPage,
  ActivityPaymentResponse,
  ActivitySlotDetails,
  AtLocationPaymentRequest,
  SimulatedPaymentRequest,
  WishlistStateResponse,
} from '../models/activity';
import { categoryLabel, Experience } from '../models/catalog';

@Injectable({ providedIn: 'root' })
export class ActivitiesApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private readonly activitiesUrl = `${this.base}/activities`;
  private readonly bookingsUrl = `${this.base}/bookings`;
  private readonly paymentsUrl = `${this.base}/payments`;

  discover(query: ActivityDiscoverQuery = {}): Observable<ActivityPage> {
    let params = new HttpParams()
      .set('sort', query.sort ?? 'newest')
      .set('limit', String(query.limit ?? 8))
      .set('offset', String(query.offset ?? 0));

    if (query.destination?.trim()) {
      params = params.set('destination', query.destination.trim());
    }
    if (query.category) {
      params = params.set('category', query.category);
    }
    if (query.date) {
      params = params.set('date', query.date);
    }
    if (query.participants != null) {
      params = params.set('participants', String(query.participants));
    }
    if (query.min_price != null) {
      params = params.set('min_price', String(query.min_price));
    }
    if (query.max_price != null) {
      params = params.set('max_price', String(query.max_price));
    }

    return this.http.get<ActivityPage>(this.activitiesUrl, {
      params,
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }

  detail(listingId: number): Observable<ActivityDetails> {
    return this.http.get<ActivityDetails>(`${this.activitiesUrl}/${listingId}`, {
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }

  availability(
    listingId: number,
    options: { date?: string; participants?: number; limit?: number; offset?: number } = {},
  ): Observable<ActivitySlotDetails[]> {
    let params = new HttpParams()
      .set('limit', String(options.limit ?? 50))
      .set('offset', String(options.offset ?? 0));

    if (options.date) {
      params = params.set('date', options.date);
    }
    if (options.participants != null) {
      params = params.set('participants', String(options.participants));
    }

    return this.http.get<ActivitySlotDetails[]>(`${this.activitiesUrl}/${listingId}/availability`, {
      params,
      context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }

  wishlist(limit = 20, offset = 0): Observable<ActivityPage> {
    const params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    return this.http.get<ActivityPage>(`${this.activitiesUrl}/wishlist`, { params });
  }

  saveToWishlist(listingId: number): Observable<WishlistStateResponse> {
    return this.http.put<WishlistStateResponse>(`${this.activitiesUrl}/${listingId}/wishlist`, {});
  }

  removeFromWishlist(listingId: number): Observable<WishlistStateResponse> {
    return this.http.delete<WishlistStateResponse>(`${this.activitiesUrl}/${listingId}/wishlist`);
  }

  createBooking(payload: ActivityBookingCreateRequest): Observable<ActivityBookingResponse> {
    return this.http.post<ActivityBookingResponse>(this.bookingsUrl, payload);
  }

  myBookings(limit = 20, beforeId?: number | null): Observable<ActivityBookingResponse[]> {
    let params = new HttpParams()
      .set('category', 'adventure')
      .set('limit', String(limit));
    if (beforeId != null) {
      params = params.set('before_id', String(beforeId));
    }
    return this.http.get<ActivityBookingResponse[]>(`${this.bookingsUrl}/my`, { params });
  }

  bookingDetail(bookingId: number): Observable<ActivityBookingDetailResponse> {
    return this.http.get<ActivityBookingDetailResponse>(`${this.bookingsUrl}/${bookingId}`);
  }

  cancelBooking(bookingId: number, reason?: string | null): Observable<ActivityBookingResponse> {
    const body: ActivityBookingStatusUpdateRequest = {
      to_status: 'cancelled',
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    };
    return this.http.patch<ActivityBookingResponse>(`${this.bookingsUrl}/${bookingId}/status`, body);
  }

  simulatePayment(payload: SimulatedPaymentRequest): Observable<ActivityPaymentResponse> {
    return this.http.post<ActivityPaymentResponse>(`${this.paymentsUrl}/simulate`, payload);
  }

  payAtLocation(payload: AtLocationPaymentRequest): Observable<ActivityPaymentResponse> {
    return this.http.post<ActivityPaymentResponse>(`${this.paymentsUrl}/at-location`, payload);
  }
}

export function activityImageUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const baseOrigin = new URL(environment.apiBaseUrl).origin;
    const url = new URL(value, baseOrigin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function formatDurationMinutes(minutes: number | null | undefined): string | undefined {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return undefined;
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours}h ${mins}m`;
}

export function formatLocation(locality: string | null | undefined, district: string | null | undefined): string {
  const cleanLocality = locality?.trim() ?? '';
  const cleanDistrict = district?.trim() ?? '';
  if (cleanLocality && cleanDistrict) {
    return cleanLocality.toLowerCase() === cleanDistrict.toLowerCase()
      ? cleanLocality
      : `${cleanLocality}, ${cleanDistrict}`;
  }
  return cleanLocality || cleanDistrict || 'Sri Lanka';
}

export function toActivityCard(item: ActivityDetails): Experience {
  const firstPhoto = item.photos?.[0];
  const categorySlug = item.activity?.category ?? 'unknown';
  return {
    id: String(item.id),
    title: item.title,
    location: formatLocation(item.locality, item.district),
    category: categorySlug,
    categoryLabel: categoryLabel(item.activity?.category),
    rating: item.rating,
    reviews: null,
    price: Number(item.price_per_participant),
    unit: 'person',
    currency: item.currency || 'LKR',
    image: activityImageUrl(firstPhoto?.image_url),
    imageAlt: firstPhoto?.alt_text ?? item.title,
    duration: formatDurationMinutes(item.activity?.duration_minutes),
    durationMinutes: item.activity?.duration_minutes,
    minParticipants: item.activity?.min_participants,
    maxParticipants: item.activity?.max_participants,
  };
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) {
    return 'Unable to connect to the CeylonGo server. Check your connection and try again.';
  }
  if (err.status === 401) {
    return 'Your session has expired or you are not signed in. Please sign in as a traveler to continue.';
  }
  if (err.status === 403) {
    return 'A signed-in traveler account is required for this action.';
  }
  const detail = err.error?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first?.msg === 'string' && first.msg.trim()) {
      return first.msg.trim();
    }
  }
  return fallback;
}

export function newRequestKey(): string {
  return generateRequestUuid();
}
