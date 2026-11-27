import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../../../core/interceptors/auth.interceptor';
import { AuthService } from '../../../core/services/auth.service';
import { generateRequestUuid } from '../../../core/utils/uuid.util';
import {
  AiBookingConfirmRequest,
  AiBookingDetailResponse,
  AiBookingProposal,
  AiBookingSelectionRequest,
  AiConversationThread,
  AiFormattedError,
  AiPaymentResponse,
  AiQuickPreferenceDraft,
  AiSavedTrip,
  AiServiceCategory,
  AiTurn,
} from '../models/ai-planner.models';

export const AI_PLANNER_SUGGESTIONS: ReadonlyArray<{
  id: string;
  title: string;
  prompt: string;
  icon: 'map' | 'home' | 'wallet' | 'sparkles';
}> = [
  {
    id: 'plan-trip',
    title: 'Plan a Trip',
    prompt: 'Plan a 3-day trip to Jaffna.',
    icon: 'map',
  },
  {
    id: 'find-homestay',
    title: 'Find a Homestay',
    prompt: 'Find a local homestay in Trincomalee.',
    icon: 'home',
  },
  {
    id: 'budget-travel',
    title: 'Budget Travel',
    prompt: 'Plan a Sri Lanka trip under LKR 50,000.',
    icon: 'wallet',
  },
  {
    id: 'local-experiences',
    title: 'Local Experiences',
    prompt: 'Recommend authentic local cultural experiences.',
    icon: 'sparkles',
  },
];

export function resolveAiMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('blob:')) return value;
  try {
    const baseOrigin = new URL(environment.apiBaseUrl).origin;
    const resolved = new URL(value, baseOrigin);
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.href : null;
  } catch {
    return null;
  }
}

export function makeIdempotencyKey(_prefix?: string): string {
  return generateRequestUuid();
}

export function formatAiPlannerError(err: unknown, fallback = 'Something went wrong.'): AiFormattedError {
  if (err instanceof Error && err.message === 'TRAVELER_AUTH_REQUIRED') {
    return {
      status: 401,
      message: 'Please sign in with a Traveler account to use CeylonGo AI Trip Planner.',
      retryAfterSeconds: null,
      code: 'auth',
    };
  }
  if (err instanceof Error && err.message === 'TRAVELER_ROLE_REQUIRED') {
    return {
      status: 403,
      message: 'A Traveler account is required for AI trip planning and booking actions.',
      retryAfterSeconds: null,
      code: 'forbidden',
    };
  }

  const httpErr = err as HttpErrorResponse;
  const status = httpErr?.status ?? 0;
  const retryHeader = httpErr?.headers?.get?.('Retry-After');
  const retryParsed = retryHeader ? Number(retryHeader) : NaN;
  const retryAfterSeconds = Number.isFinite(retryParsed) && retryParsed > 0 ? retryParsed : null;

  const rawDetail = httpErr?.error?.detail;
  const detailText =
    typeof rawDetail === 'string' && rawDetail.trim()
      ? rawDetail.trim()
      : Array.isArray(rawDetail) && rawDetail[0]?.msg
        ? String(rawDetail[0].msg)
        : '';

  if (status === 0) {
    return {
      status: 0,
      message: 'Unable to reach CeylonGo backend right now. Please check your connection and try again.',
      retryAfterSeconds: null,
      code: 'unavailable',
    };
  }
  if (status === 401) {
    return {
      status,
      message: detailText || 'Your session has expired. Please sign in again.',
      retryAfterSeconds,
      code: 'auth',
    };
  }
  if (status === 403) {
    return {
      status,
      message: detailText || 'You do not have permission to access this resource.',
      retryAfterSeconds,
      code: 'forbidden',
    };
  }
  if (status === 404) {
    return {
      status,
      message: detailText || 'The requested conversation, saved trip, or service was not found.',
      retryAfterSeconds,
      code: 'not_found',
    };
  }
  if (status === 409 || status === 410) {
    return {
      status,
      message:
        detailText ||
        'This quote or availability changed or expired. Please request a fresh booking quote.',
      retryAfterSeconds,
      code: 'expired_or_conflict',
    };
  }
  if (status === 422 || status === 400) {
    return {
      status,
      message: detailText || 'Please review the submitted details and try again.',
      retryAfterSeconds,
      code: 'validation',
    };
  }
  if (status === 429) {
    const quota = /quota/i.test(detailText);
    const waitHint = retryAfterSeconds ? ` Please wait ${retryAfterSeconds}s before retrying.` : '';
    return {
      status,
      message:
        (detailText || (quota ? 'AI quota limit reached.' : 'Too many requests in a short window.')) +
        waitHint,
      retryAfterSeconds,
      code: quota ? 'quota' : 'rate_limit',
    };
  }
  if (status === 504) {
    return {
      status,
      message: detailText || 'AI response timed out. Your message is preserved — please retry.',
      retryAfterSeconds,
      code: 'timeout',
    };
  }
  if (status === 502 || status === 503) {
    const waitHint = retryAfterSeconds ? ` Retry suggested after ${retryAfterSeconds}s.` : '';
    return {
      status,
      message: (detailText || 'CeylonGo AI service is temporarily unavailable.') + waitHint,
      retryAfterSeconds,
      code: 'unavailable',
    };
  }
  if (status >= 500) {
    return {
      status,
      message: detailText || `Server error (HTTP ${status}) while processing your request. Please try again.`,
      retryAfterSeconds,
      code: 'unknown',
    };
  }

  return {
    status,
    message: detailText || fallback,
    retryAfterSeconds,
    code: 'unknown',
  };
}

@Injectable({
  providedIn: 'root',
})
export class AiPlannerService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly aiBaseUrl = `${environment.apiBaseUrl}/ai/planner`;
  private readonly paymentsBaseUrl = `${environment.apiBaseUrl}/payments`;

  /** Pending quick planner draft passed from Homepage into /ai-planner without auto-submitting. */
  readonly pendingQuickDraft = signal<AiQuickPreferenceDraft | null>(null);
  private readonly photoCache = new Map<string, string | null>();

  setPendingQuickDraft(draft: AiQuickPreferenceDraft | null): void {
    this.pendingQuickDraft.set(draft);
  }

  consumePendingQuickDraft(): AiQuickPreferenceDraft | null {
    const current = this.pendingQuickDraft();
    this.pendingQuickDraft.set(null);
    return current;
  }

  hasTravelerSession(): boolean {
    if (!this.authService.isAuthenticated()) return false;
    const user = this.authService.currentUser();
    if (user && (user.role === 'provider' || user.role === 'admin')) return false;
    return !!this.authService.getToken();
  }

  private requireTravelerAuthHeaders(): { headers: HttpHeaders } {
    if (!this.authService.isAuthenticated()) {
      throw new Error('TRAVELER_AUTH_REQUIRED');
    }
    const user = this.authService.currentUser();
    if (user && (user.role === 'provider' || user.role === 'admin')) {
      throw new Error('TRAVELER_ROLE_REQUIRED');
    }
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('TRAVELER_AUTH_REQUIRED');
    }
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  listConversations(limit = 20, offset = 0): Observable<AiConversationThread[]> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));
    return this.http.get<AiConversationThread[]>(`${this.aiBaseUrl}/conversations`, {
      ...opts,
      params,
    });
  }

  createConversation(title = 'New Sri Lanka Trip'): Observable<AiConversationThread> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<AiConversationThread>(
      `${this.aiBaseUrl}/conversations`,
      { title: title.trim().slice(0, 120) || 'New Sri Lanka Trip' },
      opts,
    );
  }

  getConversation(conversationId: number): Observable<AiConversationThread> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.get<AiConversationThread>(`${this.aiBaseUrl}/conversations/${conversationId}`, opts);
  }

  renameConversation(conversationId: number, title: string): Observable<AiConversationThread> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.patch<AiConversationThread>(
      `${this.aiBaseUrl}/conversations/${conversationId}`,
      { title: title.trim().slice(0, 120) },
      opts,
    );
  }

  deleteConversation(conversationId: number): Observable<void> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.delete<void>(`${this.aiBaseUrl}/conversations/${conversationId}`, opts);
  }

  getMessages(conversationId: number, limit = 50, beforeId?: number): Observable<AiTurn[]> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    let params = new HttpParams().set('limit', String(limit));
    if (beforeId != null) {
      params = params.set('before_id', String(beforeId));
    }
    return this.http.get<AiTurn[]>(`${this.aiBaseUrl}/conversations/${conversationId}/messages`, {
      ...opts,
      params,
    });
  }

  sendMessage(conversationId: number, text: string): Observable<AiTurn> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<AiTurn>(
      `${this.aiBaseUrl}/conversations/${conversationId}/messages`,
      { text: text.trim().slice(0, 2500) },
      opts,
    );
  }

  requestBookingQuote(selection: AiBookingSelectionRequest): Observable<AiBookingProposal> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<AiBookingProposal>(`${this.aiBaseUrl}/booking-quotes`, selection, opts);
  }

  confirmBooking(payload: AiBookingConfirmRequest): Observable<AiBookingDetailResponse> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<AiBookingDetailResponse>(`${this.aiBaseUrl}/bookings/confirm`, payload, opts);
  }

  getBookingDetail(bookingId: number): Observable<AiBookingDetailResponse> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.get<AiBookingDetailResponse>(`${environment.apiBaseUrl}/bookings/${bookingId}`, opts);
  }

  simulatePayment(
    bookingId: number,
    requestKey: string,
    attemptNo = 1,
    simulateOutcome: 'success' | 'failure' = 'success',
  ): Observable<AiPaymentResponse> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<AiPaymentResponse>(
      `${this.paymentsBaseUrl}/simulate`,
      {
        booking_id: bookingId,
        request_key: requestKey,
        attempt_no: attemptNo,
        simulate_outcome: simulateOutcome,
      },
      opts,
    );
  }

  payAtLocation(bookingId: number, requestKey: string): Observable<AiPaymentResponse> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<AiPaymentResponse>(
      `${this.paymentsBaseUrl}/at-location`,
      {
        booking_id: bookingId,
        request_key: requestKey,
      },
      opts,
    );
  }

  listSavedTrips(limit = 20, offset = 0): Observable<AiSavedTrip[]> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));
    return this.http.get<AiSavedTrip[]>(`${this.aiBaseUrl}/trips`, {
      ...opts,
      params,
    });
  }

  saveTrip(title: string, turnId: number): Observable<AiSavedTrip> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.post<AiSavedTrip>(
      `${this.aiBaseUrl}/trips`,
      { title: title.trim().slice(0, 120), turn_id: turnId },
      opts,
    );
  }

  getSavedTrip(tripId: number): Observable<AiSavedTrip> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.get<AiSavedTrip>(`${this.aiBaseUrl}/trips/${tripId}`, opts);
  }

  updateSavedTrip(tripId: number, title: string, turnId?: number | null): Observable<AiSavedTrip> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    const body: { title: string; turn_id?: number } = { title: title.trim().slice(0, 120) };
    if (turnId != null && turnId > 0) {
      body.turn_id = turnId;
    }
    return this.http.patch<AiSavedTrip>(`${this.aiBaseUrl}/trips/${tripId}`, body, opts);
  }

  deleteSavedTrip(tripId: number): Observable<void> {
    let opts: { headers: HttpHeaders };
    try {
      opts = this.requireTravelerAuthHeaders();
    } catch (err) {
      return throwError(() => err);
    }
    return this.http.delete<void>(`${this.aiBaseUrl}/trips/${tripId}`, opts);
  }

  /**
   * Fetches a verified listing cover image from public CeylonGo listing endpoints.
   * Never fabricates placeholder images; returns null when unavailable.
   */
  resolveListingPhoto(category: AiServiceCategory, listingId: number): Observable<string | null> {
    const cacheKey = `${category}:${listingId}`;
    if (this.photoCache.has(cacheKey)) {
      return of(this.photoCache.get(cacheKey) ?? null);
    }

    const endpoint = this.buildPublicDetailEndpoint(category, listingId);
    if (!endpoint) {
      this.photoCache.set(cacheKey, null);
      return of(null);
    }

    const context = new HttpContext().set(ANONYMOUS_API_REQUEST, true);
    return this.http.get<Record<string, any>>(endpoint, { context }).pipe(
      map((res) => {
        const raw =
          res?.['cover_image_url'] ||
          res?.['image_url'] ||
          res?.['media']?.[0]?.image_url ||
          res?.['images']?.[0]?.image_url ||
          null;
        const resolved = resolveAiMediaUrl(typeof raw === 'string' ? raw : null);
        this.photoCache.set(cacheKey, resolved);
        return resolved;
      }),
      catchError(() => {
        this.photoCache.set(cacheKey, null);
        return of(null);
      }),
    );
  }

  private buildPublicDetailEndpoint(category: AiServiceCategory, listingId: number): string | null {
    switch (category) {
      case 'homestay':
        return `${environment.apiBaseUrl}/homestays/${listingId}`;
      case 'adventure':
        return `${environment.apiBaseUrl}/activities/${listingId}`;
      case 'guide':
        return `${environment.apiBaseUrl}/tour-guides/${listingId}`;
      case 'bike':
      case 'bicycle':
        return `${environment.apiBaseUrl}/rental-vehicles/${listingId}`;
      case 'artisan':
        return `${environment.apiBaseUrl}/artisan-listings/${listingId}`;
      default:
        return null;
    }
  }
}
