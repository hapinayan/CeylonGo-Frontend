import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  BookingStatusUpdateRequest,
  EvidenceFileKind,
  EvidenceFileResponse,
  EvidenceUpdate,
  HomestayBookingDetails,
  HomestayDraftState,
  HomestayRoom,
  ListingCategory,
  ListingDraftUpdate,
  ListingMediaResponse,
  ProviderDashboardStats,
  ReviewListing,
  RoomUpdate,
} from '../models/provider.models';
import { ProviderAuthService } from './provider-auth.service';

const DRAFT_STORAGE_KEY = 'ceylongo_provider_homestay_draft_v2';

@Injectable({
  providedIn: 'root',
})
export class ProviderService {
  private readonly http = inject(HttpClient);
  private readonly providerAuth = inject(ProviderAuthService);
  private readonly baseUrl = environment.apiBaseUrl;

  private getAuthHeaders(isMultipart = false): HttpHeaders {
    const token =
      typeof this.providerAuth?.getToken === 'function' ? this.providerAuth.getToken() : null;
    let headers = new HttpHeaders();
    if (!isMultipart) {
      headers = headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * Retrieves real dashboard statistics from backend listings and bookings.
   */
  getDashboardStats(): Observable<ProviderDashboardStats> {
    return forkJoin({
      listings: this.getProviderListings().pipe(catchError(() => of([] as ReviewListing[]))),
      bookings: this.getProviderBookings().pipe(
        catchError(() => of([] as HomestayBookingDetails[]))
      ),
    }).pipe(
      map(({ listings, bookings }) => {
        const total_listings = listings.length;
        const published_listings = listings.filter(
          (l) => l.verification_status === 'approved' && l.listing.is_active
        ).length;
        const pending_approvals = listings.filter(
          (l) =>
            l.verification_status === 'pending' ||
            l.verification_status === 'more_evidence_required'
        ).length;
        const total_bookings = bookings.length;

        return {
          total_listings,
          published_listings,
          pending_approvals,
          total_bookings,
        };
      })
    );
  }

  // ==========================================
  // PROVIDER LISTING APIS
  // ==========================================

  /**
   * Create an initial draft listing for a provider.
   * Endpoint: POST /api/v1/provider/listings
   */
  createDraftListing(category: ListingCategory = 'homestay'): Observable<ReviewListing> {
    return this.http.post<ReviewListing>(
      `${this.baseUrl}/provider/listings`,
      { category },
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Retrieve all listings registered by this provider.
   * Endpoint: GET /api/v1/provider/listings
   */
  getProviderListings(limit = 100, offset = 0): Observable<ReviewListing[]> {
    const url = `${this.baseUrl}/provider/listings?limit=${limit}&offset=${offset}`;
    return this.http.get<ReviewListing[]>(url, { headers: this.getAuthHeaders() }).pipe(
      map((res) => (Array.isArray(res) ? res : [])),
      catchError((err) => {
        console.warn('Error fetching provider listings:', err);
        return of([] as ReviewListing[]);
      })
    );
  }

  /**
   * Retrieve a single listing review detail.
   * Endpoint: GET /api/v1/provider/listings/{listing_id}
   */
  getProviderListing(listingId: number): Observable<ReviewListing | null> {
    return this.http
      .get<ReviewListing>(`${this.baseUrl}/provider/listings/${listingId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(() => of(null)));
  }

  /**
   * Update draft details (basic info, location, rules, metadata).
   * Material edits return an approved listing to draft on the backend.
   * Endpoint: PATCH /api/v1/provider/listings/{listing_id}
   */
  updateListingDraft(
    listingId: number,
    payload: ListingDraftUpdate
  ): Observable<ReviewListing> {
    return this.http.patch<ReviewListing>(
      `${this.baseUrl}/provider/listings/${listingId}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Submit listing for admin verification.
   * Used for both initial submission and resubmission after feedback.
   * Endpoint: POST /api/v1/provider/listings/{listing_id}/submit
   */
  submitListing(listingId: number): Observable<ReviewListing> {
    return this.http.post<ReviewListing>(
      `${this.baseUrl}/provider/listings/${listingId}/submit`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Publish an approved listing to make it discoverable by travelers.
   * Endpoint: POST /api/v1/provider/listings/{listing_id}/publish
   */
  publishListing(listingId: number): Observable<ReviewListing> {
    return this.http.post<ReviewListing>(
      `${this.baseUrl}/provider/listings/${listingId}/publish`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Unpublish an active listing.
   * Endpoint: POST /api/v1/provider/listings/{listing_id}/unpublish
   */
  unpublishListing(listingId: number): Observable<ReviewListing> {
    return this.http.post<ReviewListing>(
      `${this.baseUrl}/provider/listings/${listingId}/unpublish`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // ==========================================
  // PHOTO MANAGEMENT APIS
  // ==========================================

  /**
   * Upload listing photo via multipart form-data (Max 5MB for JPEG/PNG/WebP).
   * Endpoint: POST /api/v1/provider/listings/{listing_id}/photos
   */
  uploadPhoto(
    listingId: number,
    file: File,
    altText?: string
  ): Observable<ListingMediaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (altText) {
      formData.append('alt_text', altText);
    }
    return this.http.post<ListingMediaResponse>(
      `${this.baseUrl}/provider/listings/${listingId}/photos`,
      formData,
      { headers: this.getAuthHeaders(true) }
    );
  }

  /**
   * Designate cover photo for the listing.
   * Endpoint: PUT /api/v1/provider/listings/{listing_id}/photos/{photo_id}/cover
   */
  setCoverPhoto(listingId: number, photoId: number): Observable<ReviewListing> {
    return this.http.put<ReviewListing>(
      `${this.baseUrl}/provider/listings/${listingId}/photos/${photoId}/cover`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a listing photo.
   * Endpoint: DELETE /api/v1/provider/listings/{listing_id}/photos/{photo_id}
   */
  deletePhoto(listingId: number, photoId: number): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/provider/listings/${listingId}/photos/${photoId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Fetch authenticated photo preview blob.
   * Endpoint: GET /api/v1/provider/listings/{listing_id}/photos/{photo_id}
   */
  getPhotoBlob(listingId: number, photoId: number): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/provider/listings/${listingId}/photos/${photoId}`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob',
      }
    );
  }

  // ==========================================
  // VERIFICATION EVIDENCE APIS
  // ==========================================

  /**
   * Save external reputation links and notes.
   * Endpoint: PUT /api/v1/provider/listings/{listing_id}/evidence
   */
  saveEvidence(listingId: number, payload: EvidenceUpdate): Observable<ReviewListing> {
    return this.http.put<ReviewListing>(
      `${this.baseUrl}/provider/listings/${listingId}/evidence`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Upload verification evidence file (PDF up to 10MB, Video up to 25MB, Images up to 5MB).
   * redacted=true for customer feedback screenshots.
   * Endpoint: POST /api/v1/provider/listings/{listing_id}/evidence/files
   */
  uploadEvidenceFile(
    listingId: number,
    file: File,
    kind: EvidenceFileKind,
    redacted: boolean = false
  ): Observable<EvidenceFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    formData.append('redacted', String(redacted));

    return this.http.post<EvidenceFileResponse>(
      `${this.baseUrl}/provider/listings/${listingId}/evidence/files`,
      formData,
      { headers: this.getAuthHeaders(true) }
    );
  }

  /**
   * Delete an attached evidence file.
   * Endpoint: DELETE /api/v1/provider/listings/{listing_id}/evidence/files/{file_id}
   */
  deleteEvidenceFile(listingId: number, fileId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/provider/listings/${listingId}/evidence/files/${fileId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Fetch authenticated evidence preview blob without exposing tokens in URL.
   * Endpoint: GET /api/v1/provider/listings/{listing_id}/evidence/files/{file_id}
   */
  getEvidenceFileBlob(listingId: number, fileId: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/provider/listings/${listingId}/evidence/files/${fileId}`,
      {
        headers: this.getAuthHeaders(),
        responseType: 'blob',
      }
    );
  }

  // ==========================================
  // ROOM AND AVAILABILITY APIS
  // ==========================================

  /**
   * Add a room to the homestay listing.
   * Endpoint: POST /api/v1/provider/listings/{listing_id}/rooms
   */
  addRoom(listingId: number, room: RoomUpdate): Observable<HomestayRoom> {
    return this.http.post<HomestayRoom>(
      `${this.baseUrl}/provider/listings/${listingId}/rooms`,
      room,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update room specifications.
   * Routine room pricing, inventory, and availability updates preserve approval.
   * Endpoint: PATCH /api/v1/provider/listings/{listing_id}/rooms/{room_id}
   */
  updateRoom(
    listingId: number,
    roomId: number,
    room: Partial<RoomUpdate>
  ): Observable<HomestayRoom> {
    return this.http.patch<HomestayRoom>(
      `${this.baseUrl}/provider/listings/${listingId}/rooms/${roomId}`,
      room,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Retrieve availability slots for a listing.
   * Endpoint: GET /api/v1/provider/listings/{listing_id}/availability
   */
  getAvailabilitySlots(listingId: number): Observable<AvailabilitySlotResponse[]> {
    return this.http.get<AvailabilitySlotResponse[]>(
      `${this.baseUrl}/provider/listings/${listingId}/availability`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Add an availability slot / date block.
   * Endpoint: POST /api/v1/provider/listings/{listing_id}/availability
   */
  addAvailabilitySlot(
    listingId: number,
    slot: AvailabilitySlotCreate
  ): Observable<AvailabilitySlotResponse> {
    return this.http.post<AvailabilitySlotResponse>(
      `${this.baseUrl}/provider/listings/${listingId}/availability`,
      slot,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Update an availability slot.
   * Endpoint: PUT /api/v1/provider/listings/{listing_id}/availability/{slot_id}
   */
  updateAvailabilitySlot(
    listingId: number,
    slotId: number,
    slot: Partial<AvailabilitySlotCreate>
  ): Observable<AvailabilitySlotResponse> {
    return this.http.put<AvailabilitySlotResponse>(
      `${this.baseUrl}/provider/listings/${listingId}/availability/${slotId}`,
      slot,
      { headers: this.getAuthHeaders() }
    );
  }

  // ==========================================
  // PROVIDER BOOKINGS APIS
  // ==========================================

  /**
   * Retrieve reservations for this provider's listings.
   * Endpoint: GET /api/v1/provider/bookings
   */
  getProviderBookings(status?: string): Observable<HomestayBookingDetails[]> {
    let url = `${this.baseUrl}/provider/bookings`;
    if (status) {
      url += `?status=${encodeURIComponent(status)}`;
    }
    return this.http.get<HomestayBookingDetails[]>(url, { headers: this.getAuthHeaders() }).pipe(
      map((res) => (Array.isArray(res) ? res : [])),
      catchError((err) => {
        console.warn('Error fetching provider bookings:', err);
        return of([] as HomestayBookingDetails[]);
      })
    );
  }

  /**
   * Retrieve single reservation details.
   * Endpoint: GET /api/v1/provider/bookings/{booking_id}
   */
  getProviderBooking(bookingId: number): Observable<HomestayBookingDetails | null> {
    return this.http
      .get<HomestayBookingDetails>(`${this.baseUrl}/provider/bookings/${bookingId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(() => of(null)));
  }

  /**
   * Update booking status (confirm, reject, cancel).
   * Endpoint: PATCH /api/v1/bookings/{booking_id}/status
   */
  updateBookingStatus(
    bookingId: number,
    payload: BookingStatusUpdateRequest
  ): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/bookings/${bookingId}/status`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Backward-compatible alias for provider bookings.
   */
  getMyBookings(): Observable<any[]> {
    return this.getProviderBookings();
  }

  /**
   * Backward-compatible alias for provider listings.
   */
  getMyListings(): Observable<any[]> {
    return this.getProviderListings();
  }

  // ==========================================
  // LOCAL DRAFT MANAGEMENT
  // ==========================================

  saveDraft(draft: HomestayDraftState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Ignore
    }
  }

  getDraft(): HomestayDraftState | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const data = localStorage.getItem(DRAFT_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  clearDraft(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
