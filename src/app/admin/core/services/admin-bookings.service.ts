import { AdminAuthService } from './admin-auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminBookingDetailResponse,
  AdminBookingKPIs,
  AdminBookingListItem,
  BookingQueryParams,
} from '../models/admin-bookings.models';
import { canViewBookings } from '../utils/admin-permissions.utils';

@Injectable({
  providedIn: 'root',
})
export class AdminBookingsService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  readonly currentUser = inject(AdminAuthService).currentUser;
  readonly canViewBookings = computed(() => canViewBookings(this.currentUser()));

  getBookings(params: BookingQueryParams = {}): Observable<{
    items: AdminBookingListItem[]; total: number; page: number; page_size: number; total_pages: number;
  }> {
    let query = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '' && value !== 'all') {
        query = query.set(key === 'status' ? 'booking_status' : key, String(value));
      }
    }
    return this.http.get<{ items: AdminBookingListItem[]; total: number; page: number;
      page_size: number; total_pages: number }>(this.baseUrl + '/bookings', { params: query });
  }

  getBookingById(id: string | number): Observable<AdminBookingDetailResponse> {
    return this.http.get<AdminBookingDetailResponse>(this.baseUrl + '/bookings/' + id);
  }

  getBookingKPIs(): Observable<AdminBookingKPIs> {
    return this.http.get<AdminBookingKPIs>(this.baseUrl + '/bookings/summary');
  }

}
