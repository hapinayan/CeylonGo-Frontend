import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AVAILABLE_LANGUAGES,
  POPULAR_LOCATIONS,
  TOUR_GUIDE_CATEGORIES,
} from '../mock/tour-guides.mock';
import {
  AtLocationPaymentRequest,
  PaymentResponse,
  SimulatedPaymentRequest,
  WishlistState,
} from '../models/homestay.models';
import {
  MvpGuideBookingCreateRequest,
  MvpGuideBookingResponse,
  MvpGuideCategoryInfo,
  MvpGuideDetails,
  MvpGuidePackage,
  MvpGuidePage,
  MvpGuideSlot,
  TourCategory,
  TourGuide,
  TourGuideBookingDraft,
  TourGuideBookingRecord,
  TourGuideFilter,
  TourGuidePaymentMethod,
  TourGuideSortBy,
  TourPackage,
  TourPackagePricingUnit,
  TravelerNotification,
} from '../models/tour-guide.models';
import { AuthService } from './auth.service';

export const NEUTRAL_GUIDE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22500%22%20viewBox%3D%220%200%20800%20500%22%3E%3Crect%20fill%3D%22%23F1F5F9%22%20width%3D%22800%22%20height%3D%22500%22%2F%3E%3Ccircle%20cx%3D%22400%22%20cy%3D%22210%22%20r%3D%2248%22%20fill%3D%22%23CBD5E1%22%2F%3E%3Cpath%20d%3D%22M310%20340c0-44%2040-72%2090-72s90%2028%2090%2072%22%20fill%3D%22%23CBD5E1%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22410%22%20fill%3D%22%2364748B%22%20font-family%3D%22Inter%2Csans-serif%22%20font-size%3D%2218%22%20text-anchor%3D%22middle%22%3ENo%20Photo%20Uploaded%3C%2Ftext%3E%3C%2Fsvg%3E";

const BACKEND_CATEGORY_TO_UI_IDS: Record<string, string[]> = {
  cultural_heritage: ['culture-heritage', 'cultural_heritage'],
  adventure_nature: ['nature-hiking', 'adventure-tours', 'beach-coastal', 'adventure_nature'],
  city_village: ['city-tours', 'sightseeing', 'city_village'],
  wildlife_eco: ['eco-tourism', 'wildlife_eco'],
};

const BACKEND_CATEGORY_LABELS: Record<string, string> = {
  cultural_heritage: 'Cultural & Heritage',
  adventure_nature: 'Adventure & Nature',
  city_village: 'City & Village',
  wildlife_eco: 'Wildlife & Eco',
};

@Injectable({
  providedIn: 'root',
})
export class TourGuideService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  readonly apiMode = signal<'mock' | 'live'>(
    environment.features?.tourGuidesApiMode === 'mock' ? 'mock' : 'live'
  );
  readonly isDemoMode = computed(() => this.apiMode() === 'mock');
  readonly neutralPlaceholder = NEUTRAL_GUIDE_PLACEHOLDER;

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly categories: TourCategory[] = TOUR_GUIDE_CATEGORIES;
  readonly backendCategories = signal<MvpGuideCategoryInfo[]>([]);
  readonly popularLocations: string[] = POPULAR_LOCATIONS;
  readonly availableLanguages: string[] = AVAILABLE_LANGUAGES;

  readonly allGuides = signal<TourGuide[]>([]);
  readonly selectedGuide = signal<TourGuide | null>(null);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);
  readonly nextOffset = signal<number | null>(null);

  readonly filter = signal<TourGuideFilter>({
    query: '',
    location: '',
    date: null,
    travelers: 1,
    language: '',
    specialization: '',
    categoryId: 'all',
    sortBy: 'top_rated',
    languages: [],
    minPrice: null,
    maxPrice: null,
    minExperience: null,
    minRating: null,
    verifiedOnly: false,
  });

  readonly bookingDraft = signal<TourGuideBookingDraft | null>(null);
  readonly guideBookings = signal<TourGuideBookingRecord[]>([]);
  readonly notifications = signal<TravelerNotification[]>([]);

  private readonly favoritesSignal = signal<Set<string>>(new Set());
  readonly favorites = this.favoritesSignal.asReadonly();

  readonly filteredGuides = computed(() => {
    const list = this.allGuides();
    const f = this.filter();
    const favs = this.favoritesSignal();

    return list
      .map((guide) => ({
        ...guide,
        isFavorite: favs.has(guide.id),
      }))
      .filter((guide) => {
        if (f.categoryId && f.categoryId !== 'all') {
          if (!guide.categoryIds.includes(f.categoryId)) {
            return false;
          }
        }

        if (f.location && f.location !== 'All Locations') {
          const locLower = f.location.toLowerCase();
          const guideLocLower = guide.location.toLowerCase();
          const areaMatch = guide.serviceAreas?.some((a) =>
            a.toLowerCase().includes(locLower)
          );
          if (
            !guideLocLower.includes(locLower) &&
            !locLower.includes(guideLocLower) &&
            !areaMatch
          ) {
            return false;
          }
        }

        if (f.query && f.query.trim().length > 0) {
          const q = f.query.toLowerCase().trim();
          const matchName = guide.name.toLowerCase().includes(q);
          const matchLoc = guide.location.toLowerCase().includes(q);
          const matchLangs = guide.languages.some((l) => l.toLowerCase().includes(q));
          const matchHeadline = guide.headline?.toLowerCase().includes(q) ?? false;
          const matchSpec = guide.specialties?.some((s) => s.toLowerCase().includes(q)) ?? false;
          if (!matchName && !matchLoc && !matchLangs && !matchHeadline && !matchSpec) {
            return false;
          }
        }

        if (f.language && f.language.trim().length > 0) {
          const langLower = f.language.toLowerCase();
          const hasSearchLang = guide.languages.some(
            (l) => l.toLowerCase() === langLower
          );
          if (!hasSearchLang) {
            return false;
          }
        }

        if (f.languages.length > 0) {
          const hasLang = f.languages.some((reqLang) => guide.languages.includes(reqLang));
          if (!hasLang) {
            return false;
          }
        }

        if (f.specialization && f.specialization.trim().length > 0) {
          const specLower = f.specialization.toLowerCase().trim();
          const hasSpec =
            guide.specialties?.some((s) => s.toLowerCase().includes(specLower)) ||
            guide.categoryIds.some((c) => c.toLowerCase().includes(specLower));
          if (!hasSpec) {
            return false;
          }
        }

        if (f.minPrice !== null && guide.pricePerDay < f.minPrice) {
          return false;
        }
        if (f.maxPrice !== null && guide.pricePerDay > f.maxPrice) {
          return false;
        }

        if (f.minExperience !== null && guide.experienceYears < f.minExperience) {
          return false;
        }

        if (f.minRating !== null && guide.rating < f.minRating) {
          return false;
        }

        if (f.verifiedOnly && !guide.verified) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (f.sortBy) {
          case 'price_asc':
            return a.pricePerDay - b.pricePerDay;
          case 'price_desc':
            return b.pricePerDay - a.pricePerDay;
          case 'experience':
            return b.experienceYears - a.experienceYears;
          case 'top_rated':
          default:
            return b.rating - a.rating || b.experienceYears - a.experienceYears;
        }
      });
  });

  readonly totalCount = computed(() => this.filteredGuides().length);

  readonly totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  readonly paginatedGuides = computed(() => {
    const guides = this.filteredGuides();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return guides.slice(start, start + size);
  });

  readonly favoritesCount = computed(() => this.favoritesSignal().size);

  readonly unreadNotificationsCount = computed(() =>
    this.notifications().filter((n) => !n.read).length
  );

  /**
   * Fetches approved & published tour guides from GET /api/v1/tour-guides.
   * Never populates fake/demo fallback guides when empty or unreachable.
   */
  loadGuides(destination?: string, limit = 100, offset = 0): void {
    this.errorMessage.set(null);
    this.isLoading.set(true);

    let params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));
    if (destination && destination.trim().length > 0) {
      params = params.set('destination', destination.trim());
    }

    this.http
      .get<MvpGuidePage>(`${this.apiBaseUrl}/tour-guides`, { params })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          const detail =
            typeof error?.error?.detail === 'string'
              ? error.error.detail
              : error?.message || 'Unable to connect to the CeylonGo tour guides API.';
          this.allGuides.set([]);
          this.nextOffset.set(null);
          this.errorMessage.set(detail);
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (!response) return;
        this.isLoading.set(false);
        const mapped = (response.items || []).map((item) =>
          this.mapMvpGuideDetailsToTourGuide(item)
        );
        this.allGuides.set(mapped);
        this.nextOffset.set(response.next_offset ?? null);
      });

    this.loadBackendCategories();
    if (this.authService.isAuthenticated()) {
      this.loadWishlist();
    }
  }

  loadBackendCategories(): void {
    this.http
      .get<MvpGuideCategoryInfo[]>(`${this.apiBaseUrl}/tour-guides/categories`)
      .pipe(catchError(() => of([] as MvpGuideCategoryInfo[])))
      .subscribe((cats) => {
        if (Array.isArray(cats)) {
          this.backendCategories.set(cats);
        }
      });
  }

  /**
   * Fetches a single published tour guide from GET /api/v1/tour-guides/{listing_id}.
   */
  getGuideById(guideId: string): Observable<TourGuide | null> {
    const cleanId = encodeURIComponent(guideId);
    return this.http
      .get<MvpGuideDetails>(`${this.apiBaseUrl}/tour-guides/${cleanId}`)
      .pipe(
        map((item) => this.mapMvpGuideDetailsToTourGuide(item)),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }
          const detail =
            typeof error?.error?.detail === 'string'
              ? error.error.detail
              : error?.message || 'Unable to load tour guide details.';
          return throwError(() => new Error(detail));
        })
      );
  }

  /**
   * Fetches active scheduled packages for a published guide from GET /api/v1/tour-guides/{id}/packages.
   */
  getGuidePackages(listingId: number | string): Observable<TourPackage[]> {
    return this.http
      .get<MvpGuidePackage[]>(
        `${this.apiBaseUrl}/tour-guides/${encodeURIComponent(String(listingId))}/packages`
      )
      .pipe(
        map((items) =>
          (Array.isArray(items) ? items : []).map((pkg) =>
            this.mapMvpPackageToTourPackage(pkg, this.neutralPlaceholder)
          )
        )
      );
  }

  /**
   * Fetches server-authoritative availability slots & LKR quotes from GET /api/v1/tour-guides/{id}/availability.
   */
  getGuideAvailability(
    listingId: number | string,
    packageId: number | string,
    participants = 1,
    date?: string | null
  ): Observable<MvpGuideSlot[]> {
    let params = new HttpParams()
      .set('package_id', String(packageId))
      .set('participants', String(Math.max(1, participants)));
    if (date && date.trim().length > 0) {
      params = params.set('date', date.trim());
    }

    return this.http
      .get<MvpGuideSlot[]>(
        `${this.apiBaseUrl}/tour-guides/${encodeURIComponent(String(listingId))}/availability`,
        { params }
      )
      .pipe(map((slots) => (Array.isArray(slots) ? slots : [])));
  }

  /**
   * Loads the traveler's persistent backend wishlist via GET /api/v1/tour-guides/wishlist.
   */
  loadWishlist(limit = 100, offset = 0): void {
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));
    this.http
      .get<MvpGuidePage>(`${this.apiBaseUrl}/tour-guides/wishlist`, { params })
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (!page) return;
        const ids = new Set(
          (page.items || []).map((item) => String(item.listing.id))
        );
        this.favoritesSignal.set(ids);
      });
  }

  /**
   * Toggles wishlist state on backend via PUT / DELETE /api/v1/tour-guides/{id}/wishlist.
   */
  toggleFavorite(guideId: string): void {
    const currentlySaved = this.favoritesSignal().has(guideId);
    const url = `${this.apiBaseUrl}/tour-guides/${encodeURIComponent(guideId)}/wishlist`;

    const request$ = currentlySaved
      ? this.http.delete<WishlistState>(url)
      : this.http.put<WishlistState>(url, {});

    request$.subscribe({
      next: (res) => {
        this.favoritesSignal.update((set) => {
          const next = new Set(set);
          if (res?.saved) {
            next.add(guideId);
          } else {
            next.delete(guideId);
          }
          return next;
        });
      },
      error: (err: HttpErrorResponse) => {
        console.warn('Wishlist update failed:', err?.error?.detail || err?.message);
      },
    });
  }

  isFavorite(guideId: string): boolean {
    return this.favoritesSignal().has(guideId);
  }

  /**
   * Executes real booking creation (`POST /bookings`) followed by Academic Demo Online Payment
   * (`POST /payments/simulate`) or Pay at Location (`POST /payments/at-location`).
   * Preserves an already-created booking ID across payment retries so failed simulated
   * payments can retry safely without creating duplicate reservations.
   */
  submitGuideBooking(params: {
    guide: TourGuide;
    selectedPackage: TourPackage;
    draft: TourGuideBookingDraft;
    selectedSlot?: MvpGuideSlot | null;
    existingBooking?: MvpGuideBookingResponse | null;
    paymentMethod: TourGuidePaymentMethod;
    simulateOutcome?: 'success' | 'failure';
    paymentAttemptNo?: number;
    paymentRequestKey?: string;
    travelerName: string;
    travelerEmail: string;
    travelerPhone?: string;
    onBookingCreated?: (booking: MvpGuideBookingResponse) => void;
  }): Observable<TourGuideBookingRecord> {
    const slot = params.selectedSlot;
    if (!params.existingBooking && !slot) {
      return throwError(
        () =>
          new Error(
            'No open scheduled slot is selected for this guide package. Select an available slot first.'
          )
      );
    }

    const booking$: Observable<MvpGuideBookingResponse> = params.existingBooking
      ? of(params.existingBooking)
      : this.http
          .post<MvpGuideBookingResponse>(`${this.apiBaseUrl}/bookings`, {
            listing_id: Number(params.guide.id),
            slot_id: slot!.id,
            starts_at: slot!.starts_at,
            ends_at: slot!.ends_at,
            quantity: params.draft.travelers,
            expected_total: String(slot!.total_amount),
            request_key: params.draft.requestKey,
          } satisfies MvpGuideBookingCreateRequest)
          .pipe(
            tap((created) => {
              params.onBookingCreated?.(created);
            })
          );

    return booking$.pipe(
      switchMap((booking) => {
        const payKey = params.paymentRequestKey || this.createRequestKey();
        const attemptNo = Math.max(1, params.paymentAttemptNo ?? 1);

        const payment$: Observable<PaymentResponse> =
          params.paymentMethod === 'simulated'
            ? this.http.post<PaymentResponse>(`${this.apiBaseUrl}/payments/simulate`, {
                booking_id: booking.id,
                request_key: payKey,
                attempt_no: attemptNo,
                simulate_outcome: params.simulateOutcome ?? 'success',
              } satisfies SimulatedPaymentRequest)
            : this.http.post<PaymentResponse>(`${this.apiBaseUrl}/payments/at-location`, {
                booking_id: booking.id,
                request_key: payKey,
              } satisfies AtLocationPaymentRequest);

        return payment$.pipe(
          map((payment) => {
            if (payment.status === 'demo_failed') {
              throw new Error(
                'Academic Demo Online Payment simulated failure. Your booking reservation has not been duplicated—you may safely retry or switch to Pay at Location.'
              );
            }

            const record: TourGuideBookingRecord = {
              id: String(booking.id),
              bookingReference: booking.booking_reference || `GUIDE-${booking.id}`,
              requestKey: booking.request_key,
              guideId: params.guide.id,
              guideName: params.guide.name,
              guideAvatarUrl: params.guide.avatarUrl,
              packageId: params.selectedPackage.id,
              packageName: params.selectedPackage.name,
              durationLabel: params.selectedPackage.durationLabel,
              meetingPoint:
                params.selectedPackage.meetingPoint ||
                params.guide.meetingPoint ||
                params.guide.location,
              location: params.guide.location,
              date: params.draft.date,
              time: params.draft.time,
              travelers: booking.quantity,
              totalAmount: Number(booking.total_amount),
              currency: booking.currency || 'LKR',
              pricingUnit: params.selectedPackage.pricingUnit,
              paymentMethod: params.paymentMethod,
              paymentStatus: payment.status === 'demo_succeeded' ? 'paid_demo' : 'unpaid',
              bookingStatus:
                (booking.status as TourGuideBookingRecord['bookingStatus']) || 'pending',
              travelerName: params.travelerName,
              travelerEmail: params.travelerEmail,
              travelerPhone: params.travelerPhone,
              createdAt: booking.created_at,
            };

            this.guideBookings.update((list) => [
              record,
              ...list.filter((b) => b.id !== record.id),
            ]);
            return record;
          })
        );
      }),
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse) {
          const detail =
            typeof err.error?.detail === 'string'
              ? err.error.detail
              : err.message || 'Booking request failed.';
          return throwError(() => new Error(detail));
        }
        return throwError(() => err);
      })
    );
  }

  formatPricingUnitLabel(unit?: TourPackagePricingUnit): string {
    switch (unit) {
      case 'per_person':
        return '/ person';
      case 'per_group':
        return '/ group';
      case 'per_day':
      default:
        return '/ day';
    }
  }

  calculatePackageTotal(pkg: TourPackage, travelers: number, days = 1): number {
    const safeTravelers = Math.max(1, travelers);
    const safeDays = Math.max(1, days);
    switch (pkg.pricingUnit) {
      case 'per_person':
        return pkg.price * safeTravelers;
      case 'per_group':
        return pkg.price;
      case 'per_day':
      default:
        return pkg.price * safeDays;
    }
  }

  setBookingDraft(draft: TourGuideBookingDraft): void {
    this.bookingDraft.set(draft);
  }

  clearBookingDraft(): void {
    this.bookingDraft.set(null);
  }

  createRequestKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `tg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.slice(0, 36);
  }

  // Filter / Pagination / Navigation Helpers
  setCategory(categoryId: string): void {
    this.filter.update((f) => ({ ...f, categoryId }));
    this.currentPage.set(1);
  }

  setSearchQuery(query: string): void {
    this.filter.update((f) => ({ ...f, query }));
    this.currentPage.set(1);
  }

  setLocation(location: string): void {
    this.filter.update((f) => ({ ...f, location }));
    this.currentPage.set(1);
  }

  setDate(date: string | null): void {
    this.filter.update((f) => ({ ...f, date }));
  }

  setTravelers(travelers: number): void {
    this.filter.update((f) => ({ ...f, travelers: Math.max(1, travelers) }));
  }

  setLanguage(language: string): void {
    this.filter.update((f) => ({ ...f, language }));
    this.currentPage.set(1);
  }

  setSortBy(sortBy: TourGuideSortBy): void {
    this.filter.update((f) => ({ ...f, sortBy }));
    this.currentPage.set(1);
  }

  updateFilter(partial: Partial<TourGuideFilter>): void {
    this.filter.update((f) => ({ ...f, ...partial }));
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.filter.set({
      query: '',
      location: '',
      date: null,
      travelers: 1,
      language: '',
      specialization: '',
      categoryId: 'all',
      sortBy: 'top_rated',
      languages: [],
      minPrice: null,
      maxPrice: null,
      minExperience: null,
      minRating: null,
      verifiedOnly: false,
    });
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  selectGuide(guide: TourGuide | null): void {
    this.selectedGuide.set(guide);
  }

  markNotificationAsRead(id: string): void {
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  markAllNotificationsRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
  }

  formatSlotTimeRange(startsAt: string, endsAt: string): string {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    if (Number.isNaN(s.getTime())) return startsAt;
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Colombo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    const startStr = s.toLocaleTimeString('en-LK', opts);
    if (Number.isNaN(e.getTime())) return startStr;
    return `${startStr} – ${e.toLocaleTimeString('en-LK', opts)}`;
  }

  slotSriLankaDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  // ===========================================================================
  // BACKEND RESPONSE MAPPERS (Exact Academic MVP Contract)
  // ===========================================================================

  mapMvpGuideDetailsToTourGuide(item: MvpGuideDetails): TourGuide {
    const { listing, provider_name, profile } = item;
    const mediaUrls = (listing.media || [])
      .map((m) => this.resolveImageUrl(m.image_url))
      .filter((u): u is string => Boolean(u));

    const coverImage = mediaUrls[0] || this.neutralPlaceholder;
    const avatarImage = mediaUrls[0] || this.neutralPlaceholder;

    const rawPackages = (item.packages || []).filter((p) => p.is_active !== false);
    const mappedPackages = rawPackages.map((pkg) =>
      this.mapMvpPackageToTourPackage(pkg, coverImage)
    );

    const lowestPackage = mappedPackages.reduce<TourPackage | null>((min, curr) => {
      if (!min) return curr;
      return curr.price < min.price ? curr : min;
    }, null);

    const listingPrice = Number(listing.price) || 0;
    const startingPrice = lowestPackage ? lowestPackage.price : listingPrice;
    const pricingUnit: TourPackagePricingUnit = lowestPackage
      ? lowestPackage.pricingUnit
      : 'per_group';

    const backendCats = profile?.categories || [];
    const uiCategoryIds = Array.from(
      new Set(
        backendCats.flatMap((slug) => BACKEND_CATEGORY_TO_UI_IDS[slug] || [slug])
      )
    );
    const specialties = backendCats.map(
      (slug) => BACKEND_CATEGORY_LABELS[slug] || slug
    );

    const languages =
      profile?.languages?.map((l) => l.language_name).filter(Boolean) || [];

    const serviceAreas =
      profile?.service_areas?.map((a) =>
        [a.city, a.district].filter(Boolean).join(', ')
      ) || [];

    const locationParts = [listing.locality, listing.district].filter(
      (part) => Boolean(part && part.trim())
    );
    const location = locationParts.join(', ') || 'Sri Lanka';

    const lat = Number(listing.latitude);
    const lng = Number(listing.longitude);
    const hasCoords =
      listing.latitude != null &&
      listing.longitude != null &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lng);

    const verified = listing.approval_status === 'approved';
    const qualifications: string[] = [];
    if (verified) {
      qualifications.push('Verified Guide Listing (Admin Approved)');
    }
    if (serviceAreas.length > 0) {
      qualifications.push(`Service Areas: ${serviceAreas.join(' · ')}`);
    }

    const aboutText = listing.description || '';
    const firstParagraph = aboutText.split('\n\n')[0] || '';

    return {
      id: String(listing.id),
      name: listing.title || provider_name || `Guide #${listing.id}`,
      providerName: provider_name,
      avatarUrl: avatarImage,
      coverImageUrl: coverImage,
      galleryImages: mediaUrls.length > 0 ? mediaUrls : [this.neutralPlaceholder],
      verified,
      rating: 0,
      reviewsCount: 0,
      experienceYears: profile?.years_of_experience ?? 0,
      languages,
      pricePerDay: startingPrice,
      pricingUnit,
      currency: listing.currency || 'LKR',
      location,
      categoryIds: uiCategoryIds,
      headline: firstParagraph,
      about: aboutText,
      specialties,
      serviceAreas,
      qualifications,
      licenseStatus: verified ? 'Admin Verified Guide' : undefined,
      meetingPoint: mappedPackages[0]?.meetingPoint || location,
      meetingCoords: hasCoords ? { lat, lng } : null,
      cancellationPolicy:
        profile?.cancellation_policy || 'Contact the guide for cancellation terms.',
      packages: mappedPackages,
      reviews: [],
      isFavorite: this.favoritesSignal().has(String(listing.id)),
      isPreviewSample: false,
    };
  }

  private mapMvpPackageToTourPackage(
    pkg: MvpGuidePackage,
    fallbackImage: string
  ): TourPackage {
    const hours = Number(pkg.duration_hours) || 0;
    const durationLabel =
      hours >= 24
        ? `${(hours / 24).toFixed(hours % 24 === 0 ? 0 : 1)} Day(s)`
        : `${hours} Hour${hours === 1 ? '' : 's'}`;

    const splitList = (raw?: string | null): string[] =>
      raw
        ? raw
            .split(/\r?\n|,/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const highlights = splitList(pkg.itinerary);

    return {
      id: String(pkg.id),
      name: pkg.title,
      tourType: pkg.pricing_type === 'per_group' ? 'Private Group Tour' : 'Guided Tour',
      shortDescription: pkg.description,
      imageUrl: fallbackImage,
      durationLabel,
      durationHours: hours,
      durationDays: Math.max(1, Math.ceil(hours / 24)),
      minGroupSize: 1,
      maxGroupSize: pkg.max_people || 1,
      destinations: [pkg.meeting_point].filter(Boolean),
      price: Number(pkg.price) || 0,
      pricingUnit: pkg.pricing_type,
      currency: pkg.currency || 'LKR',
      meetingPoint: pkg.meeting_point,
      availableTimes: [],
      highlights,
      included: splitList(pkg.included_services),
      excluded: splitList(pkg.excluded_services),
    };
  }

  private resolveImageUrl(imageUrl?: string | null): string | null {
    if (!imageUrl || !imageUrl.trim()) return null;
    const trimmed = imageUrl.trim();
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
      return trimmed;
    }
    try {
      const origin = new URL(this.apiBaseUrl).origin;
      return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    } catch {
      return trimmed;
    }
  }
}
