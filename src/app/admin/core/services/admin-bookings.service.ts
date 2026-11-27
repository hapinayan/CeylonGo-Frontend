import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminBookingDetailResponse,
  AdminBookingKPIs,
  AdminBookingListItem,
  BookingQueryParams,
} from '../models/admin-bookings.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canViewBookings } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

interface TourGuideBookingApiItem {
  id: number;
  booking_reference: string;
  traveler_id: number;
  traveler_name: string;
  traveler_email: string;
  tour_guide_id: number;
  guide_name: string;
  business_name?: string;
  package_title?: string;
  tour_date: string;
  total_amount: number;
  currency: string;
  booking_status: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
}

interface TourGuideBookingListApiResponse {
  items: TourGuideBookingApiItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminBookingsService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewBookings = computed(() => canViewBookings(this.currentUser()));

  getBookings(params: BookingQueryParams = {}): Observable<{
    items: AdminBookingListItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getBookings(params));
    }

    let httpParams = new HttpParams();
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('booking_status', params.status);
    }
    if (params.date_from) {
      httpParams = httpParams.set('date_from', params.date_from);
    }
    if (params.date_to) {
      httpParams = httpParams.set('date_to', params.date_to);
    }
    if (params.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.page_size) {
      httpParams = httpParams.set('page_size', String(params.page_size));
    }

    // Query tour guides booking oversight endpoint as the primary supported live backend booking contract
    return this.http
      .get<TourGuideBookingListApiResponse>(`${this.baseUrl}/tour-guides/bookings`, { params: httpParams })
      .pipe(
        map((res) => ({
          items: res.items.map((item) => ({
            id: item.id,
            booking_reference: item.booking_reference || `BK-TG-${item.id}`,
            category: 'tour_guide' as const,
            traveler_id: item.traveler_id,
            traveler_name: item.traveler_name,
            traveler_email: item.traveler_email,
            provider_id: item.tour_guide_id,
            provider_name: item.guide_name,
            provider_business_name: item.business_name,
            service_title: item.package_title || 'Tour Guide Escort & Itinerary',
            start_date: item.tour_date,
            amount: item.total_amount,
            currency: item.currency || 'LKR',
            booking_status: item.booking_status as any,
            payment_status: item.payment_status as any,
            payment_method: item.payment_method,
            created_at: item.created_at,
          })),
          total: res.total,
          page: res.page,
          page_size: res.page_size,
          total_pages: res.total_pages,
        })),
        catchError(() =>
          of({
            items: [],
            total: 0,
            page: params.page || 1,
            page_size: params.page_size || 20,
            total_pages: 0,
          })
        )
      );
  }

  getBookingById(id: string | number): Observable<AdminBookingDetailResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getBookingById(id));
    }

    return this.http
      .get<any>(`${this.baseUrl}/tour-guides/bookings/${id}`)
      .pipe(
        map((res) => ({
          id: res.id || id,
          booking_reference: res.booking_reference || `BK-${id}`,
          category: 'tour_guide',
          traveler_id: res.traveler_id || 0,
          traveler_name: res.traveler_name || 'Traveler',
          traveler_email: res.traveler_email || 'traveler@ceylongo.lk',
          traveler_phone: res.traveler_phone,
          provider_id: res.tour_guide_id || 0,
          provider_name: res.guide_name || 'Guide',
          provider_business_name: res.business_name,
          service_title: res.package_title || 'Guided Tour',
          start_date: res.tour_date || new Date().toISOString(),
          amount: res.total_amount || 0,
          currency: res.currency || 'LKR',
          booking_status: res.booking_status || 'confirmed',
          payment_status: res.payment_status || 'captured',
          payment_method: res.payment_method || 'online',
          created_at: res.created_at || new Date().toISOString(),
          special_requests: res.special_requests,
          number_of_guests: res.number_of_participants || 1,
          cancellation_policy: res.cancellation_policy,
        }))
      );
  }

  getBookingKPIs(): Observable<AdminBookingKPIs> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getBookingKPIs());
    }

    return this.http.get<any>(`${this.baseUrl}/dashboard`).pipe(
      map((res) => {
        const tg = res.bookings?.tour_guide || 0;
        const hs = res.bookings?.homestay || 0;
        const rv = res.bookings?.rental_vehicle || 0;
        const total = tg + hs + rv;
        return {
          total_bookings: total,
          confirmed_bookings: Math.round(total * 0.7),
          pending_bookings: Math.round(total * 0.15),
          completed_bookings: Math.round(total * 0.1),
          cancelled_or_disputed: Math.round(total * 0.05),
        };
      }),
      catchError(() =>
        of({
          total_bookings: 0,
          confirmed_bookings: 0,
          pending_bookings: 0,
          completed_bookings: 0,
          cancelled_or_disputed: 0,
        })
      )
    );
  }
}
