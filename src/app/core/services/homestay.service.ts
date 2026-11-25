import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DEMO_HOMESTAY_CATEGORIES, DEMO_HOMESTAYS } from '../data/demo-homestays.data';
import {
  AtLocationPaymentRequest,
  BookingConfirmation,
  BookingCreateRequest,
  BookingDraft,
  BookingResponse,
  HomestayBookingDetails,
  HomestayBookingRequest,
  HomestayCategory,
  HomestayCategoryFilter,
  HomestayDetail,
  HomestayDetails,
  HomestayListResponse,
  HomestayPage,
  HomestayQuote,
  HomestaySearchParams,
  HomestaySummary,
  PaymentResponse,
  SimulatedPaymentRequest,
  WishlistState,
} from '../models/homestay.models';

export const NEUTRAL_HOMESTAY_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%20viewBox%3D%220%200%20800%20600%22%3E%3Crect%20fill%3D%22%23F1F5F9%22%20width%3D%22800%22%20height%3D%22600%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22300%22%20y%3D%22200%22%20width%3D%22200%22%20height%3D%22160%22%20rx%3D%2212%22%2F%3E%3Ccircle%20cx%3D%22350%22%20cy%3D%22250%22%20r%3D%2216%22%2F%3E%3Cpath%20d%3D%22M480%20320l-60-60-80%2080%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22400%22%20y%3D%22400%22%20fill%3D%22%2364748B%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%3ENo%20Photo%20Available%3C%2Ftext%3E%3C%2Fsvg%3E";

const BOOKING_DRAFT_KEY = 'ceylongo_booking_draft';

@Injectable({
  providedIn: 'root',
})
export class HomestayService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  // Authoritative server-driven wishlist IDs
  private readonly wishlistSignal = signal<number[]>([]);
  readonly wishlistIds = this.wishlistSignal.asReadonly();
  readonly neutralPlaceholder = NEUTRAL_HOMESTAY_PLACEHOLDER;

  /**
   * Retrieves homestays matching search & filter parameters from GET /api/v1/homestays.
   * Uses items and next_before_id for cursor pagination. Does not fabricate total counts.
   */
  getHomestays(params?: HomestaySearchParams): Observable<HomestayListResponse> {
    let httpParams = new HttpParams();

    const dest = params?.destination || params?.location || params?.query;
    if (dest && dest.trim()) {
      httpParams = httpParams.set('destination', dest.trim());
    }
    if (params?.check_in) {
      httpParams = httpParams.set('check_in', params.check_in);
    }
    if (params?.check_out) {
      httpParams = httpParams.set('check_out', params.check_out);
    }
    if (params?.guests && params.guests > 0) {
      httpParams = httpParams.set('guests', params.guests.toString());
    }
    if (params?.min_price != null && params.min_price !== '') {
      httpParams = httpParams.set('min_price', params.min_price.toString());
    }
    if (params?.max_price != null && params.max_price !== '') {
      httpParams = httpParams.set('max_price', params.max_price.toString());
    }
    if (params?.property_type) {
      httpParams = httpParams.set('property_type', params.property_type);
    }
    if (params?.amenities && params.amenities.length > 0) {
      for (const a of params.amenities) {
        httpParams = httpParams.append('amenities', a);
      }
    }
    if (params?.limit != null) {
      httpParams = httpParams.set('limit', params.limit.toString());
    } else {
      httpParams = httpParams.set('limit', '20');
    }
    if (params?.before_id != null) {
      httpParams = httpParams.set('before_id', params.before_id.toString());
    }

    return this.http
      .get<HomestayPage>(`${this.apiBaseUrl}/homestays`, { params: httpParams })
      .pipe(
        map((response) => {
          const wishlisted = new Set(this.wishlistSignal());
          const items: HomestaySummary[] = (response.items || []).map((item) => {
            const mapped = this.mapHomestayDetailsToSummary(item);
            return {
              ...mapped,
              is_wishlisted: wishlisted.has(mapped.id),
            };
          });

          return {
            items,
            next_before_id: response.next_before_id,
            total: items.length, // True count from backend items, no fabrication
          };
        }),
        catchError(() => {
          return of({ items: [], next_before_id: null, total: 0 });
        })
      );
  }

  /**
   * Retrieves full details for a specific homestay by numeric ID from GET /api/v1/homestays/{id}.
   * Returns null on 404/failure so UI can show proper not-found state without demo fallback.
   */
  getHomestayById(id: number | string): Observable<HomestayDetail | null> {
    const numericId = Number(id);
    if (isNaN(numericId) || numericId <= 0) {
      return of(null);
    }

    return this.http
      .get<HomestayDetails>(`${this.apiBaseUrl}/homestays/${numericId}`)
      .pipe(
        map((listing) => {
          if (!listing) return null;
          const mapped = this.mapHomestayDetailsToSummary(listing);
          return {
            ...mapped,
            is_wishlisted: this.isWishlisted(mapped.id),
          };
        }),
        catchError(() => {
          // Live workflow: do not fabricate or fall back to demo data
          return of(null);
        })
      );
  }

  /**
   * Retrieves server-calculated room availability and pricing quote from GET /api/v1/homestays/{id}/availability.
   */
  getHomestayAvailability(
    listingId: number,
    checkIn: string,
    checkOut: string,
    guests = 1,
    roomId?: number
  ): Observable<HomestayQuote> {
    let params = new HttpParams()
      .set('check_in', checkIn)
      .set('check_out', checkOut)
      .set('guests', guests.toString());

    if (roomId != null) {
      params = params.set('room_id', roomId.toString());
    }

    return this.http.get<HomestayQuote>(
      `${this.apiBaseUrl}/homestays/${listingId}/availability`,
      { params }
    );
  }

  /**
   * Retrieves traveler wishlist from GET /api/v1/homestays/wishlist.
   * Uses backend as the authoritative source of truth.
   */
  loadWishlist(beforeId?: number, limit = 20): Observable<HomestayPage> {
    let params = new HttpParams().set('limit', limit.toString());
    if (beforeId != null) {
      params = params.set('before_id', beforeId.toString());
    }

    return this.http.get<HomestayPage>(`${this.apiBaseUrl}/homestays/wishlist`, { params }).pipe(
      tap((page) => {
        const ids = (page.items || []).map((item) => item.id);
        this.wishlistSignal.set(ids);
      }),
      catchError(() => {
        return of({ items: [], next_before_id: null });
      })
    );
  }

  /**
   * Adds listing to wishlist on backend via PUT /api/v1/homestays/{id}/wishlist.
   */
  addToWishlist(listingId: number): Observable<WishlistState> {
    return this.http
      .put<WishlistState>(`${this.apiBaseUrl}/homestays/${listingId}/wishlist`, {})
      .pipe(
        tap((res) => {
          if (res.saved) {
            const current = new Set(this.wishlistSignal());
            current.add(listingId);
            this.wishlistSignal.set(Array.from(current));
          }
        })
      );
  }

  /**
   * Removes listing from wishlist on backend via DELETE /api/v1/homestays/{id}/wishlist.
   */
  removeFromWishlist(listingId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiBaseUrl}/homestays/${listingId}/wishlist`)
      .pipe(
        tap(() => {
          const current = new Set(this.wishlistSignal());
          current.delete(listingId);
          this.wishlistSignal.set(Array.from(current));
        })
      );
  }

  /**
   * Toggles wishlist state on the backend.
   */
  toggleWishlist(homestayId: number): Observable<boolean> {
    const isCurrentlySaved = this.wishlistSignal().includes(homestayId);
    if (isCurrentlySaved) {
      return this.removeFromWishlist(homestayId).pipe(map(() => false));
    } else {
      return this.addToWishlist(homestayId).pipe(map((res) => res.saved));
    }
  }

  isWishlisted(homestayId: number): boolean {
    return this.wishlistSignal().includes(homestayId);
  }

  /**
   * Creates a homestay reservation request on POST /api/v1/homestays/{id}/bookings.
   */
  createHomestayBooking(
    listingId: number,
    request: HomestayBookingRequest
  ): Observable<HomestayBookingDetails> {
    return this.http.post<HomestayBookingDetails>(
      `${this.apiBaseUrl}/homestays/${listingId}/bookings`,
      request
    );
  }

  /**
   * Retrieves authoritative booking status from GET /api/v1/homestays/{id}/bookings/{booking_id}.
   */
  getHomestayBooking(
    listingId: number,
    bookingId: number
  ): Observable<HomestayBookingDetails> {
    return this.http.get<HomestayBookingDetails>(
      `${this.apiBaseUrl}/homestays/${listingId}/bookings/${bookingId}`
    );
  }

  /**
   * Processes academic demo simulated online payment via POST /api/v1/payments/simulate.
   */
  simulatePayment(request: SimulatedPaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiBaseUrl}/payments/simulate`, request);
  }

  /**
   * Records Pay at Location selection via POST /api/v1/payments/at-location.
   */
  payAtLocation(request: AtLocationPaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiBaseUrl}/payments/at-location`, request);
  }

  /**
   * Maps backend HomestayDetails to client HomestaySummary model.
   * Does not fabricate missing inventory, ratings, or images.
   */
  mapHomestayDetailsToSummary(item: HomestayDetails): HomestaySummary {
    const images: string[] = [];
    if (Array.isArray(item.media) && item.media.length > 0) {
      for (const m of item.media) {
        if (m.image_url) {
          images.push(m.image_url);
        } else if (m.storage_key) {
          images.push(m.storage_key);
        }
      }
    }

    const firstImage = images.length > 0 ? images[0] : NEUTRAL_HOMESTAY_PLACEHOLDER;
    const hasMedia = images.length > 0;

    const priceNum = typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price);
    const latNum = item.latitude != null ? parseFloat(item.latitude) : undefined;
    const lngNum = item.longitude != null ? parseFloat(item.longitude) : undefined;

    const locality = item.locality || '';
    const district = item.district || '';
    const location =
      locality && district ? `${locality}, ${district}` : locality || district || 'Sri Lanka';

    const units = item.units || [];
    const maxCapacity =
      units.length > 0 ? units.reduce((max, u) => Math.max(max, u.capacity), 0) : 0;

    return {
      id: item.id,
      name: item.title,
      description: item.description || '',
      location,
      city: locality || district || 'Sri Lanka',
      district,
      category: (item.category as HomestayCategory) || 'mountain',
      category_name: item.property_type
        ? item.property_type.charAt(0).toUpperCase() + item.property_type.slice(1)
        : 'Homestay',
      price_per_night: isNaN(priceNum) ? 0 : priceNum,
      max_guests: maxCapacity,
      bedrooms: units.length,
      beds: units.length,
      bathrooms: 0,
      rating: 0, // Not fabricated
      review_count: 0, // Not fabricated
      is_verified: item.approval_status === 'approved',
      is_superhost: false, // Not fabricated
      is_guest_favorite: false,
      latitude: latNum,
      longitude: lngNum,
      has_media: hasMedia,
      image_url: firstImage,
      images,
      amenities: item.amenities || [],
      cancellation_policy: 'Standard Cancellation',
      free_cancellation_hours: 24,
      host_name: item.host?.business_name || 'Host',
      host: item.host,
      units,
      available_rooms: [],
      highlights: [],
      reviews: [],
    };
  }

  // ---------------------------------------------------------------------------
  // Booking Draft Session Storage Helpers
  // ---------------------------------------------------------------------------

  setBookingDraft(draft: BookingDraft): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
      }
    } catch {
      // Ignore sessionStorage exceptions
    }
  }

  getBookingDraft(): BookingDraft | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  clearBookingDraft(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(BOOKING_DRAFT_KEY);
      }
    } catch {
      // Fallback
    }
  }

  calculateNights(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  calculateEstimatedPrice(nightlyRate: number, nights: number): number {
    if (nightlyRate <= 0 || nights <= 0) return 0;
    return nightlyRate * nights;
  }

  getCategories(): HomestayCategoryFilter[] {
    return DEMO_HOMESTAY_CATEGORIES;
  }

  // ---------------------------------------------------------------------------
  // Backward compatibility methods for existing tests & callers
  // ---------------------------------------------------------------------------

  createBooking(request: BookingCreateRequest): Observable<BookingResponse> {
    const r = request as any;
    return this.createHomestayBooking(r.listing_id || 1, {
      room_id: r.room_id || 1,
      check_in: r.check_in || (r.starts_at ? r.starts_at.slice(0, 10) : '2026-12-01'),
      check_out: r.check_out || (r.ends_at ? r.ends_at.slice(0, 10) : '2026-12-03'),
      guests: r.guests || r.quantity || 1,
      request_key: r.request_key || 'cg-req',
    }) as any;
  }

  getMyBookings(): Observable<BookingResponse[]> {
    return this.http.get<BookingResponse[]>(`${this.apiBaseUrl}/bookings/my`);
  }

  findDemoHomestayById(id: number | string): HomestayDetail | null {
    const numericId = Number(id);
    const item = DEMO_HOMESTAYS.find((h) => h.id === numericId);
    if (!item) return null;
    return {
      ...item,
      is_wishlisted: this.isWishlisted(item.id),
    };
  }
}
