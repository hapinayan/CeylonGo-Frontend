import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  TravelerAccount,
  TravelerDirectory,
  TravelerQueryParams,
  TravelerStatusEvent,
  TravelerStatusUpdate,
} from '../models/admin-travelers.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminTravelersService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AdminAuthService);
  private readonly previewState = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/travelers`;

  /**
   * Retrieves a paginated list of travelers with optional filters.
   * In demo preview mode, routes to isolated in-memory preview state.
   */
  getTravelers(params?: TravelerQueryParams): Observable<TravelerDirectory> {
    if (this.authService.isDemoSession()) {
      try {
        const result = this.previewState.getTravelers(params);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    let httpParams = new HttpParams();
    if (params) {
      if (params.page !== undefined && params.page !== null) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.page_size !== undefined && params.page_size !== null) {
        httpParams = httpParams.set('page_size', params.page_size.toString());
      } else if (params.limit !== undefined && params.limit !== null) {
        httpParams = httpParams.set('page_size', params.limit.toString());
      }
      if (params.is_active !== undefined && params.is_active !== null) {
        httpParams = httpParams.set('is_active', params.is_active.toString());
      }
      if (params.search && params.search.trim()) {
        httpParams = httpParams.set('search', params.search.trim());
      }
    }

    return this.http.get<TravelerDirectory>(this.baseUrl, { params: httpParams }).pipe(
      catchError((error) => {
        // Honest error propagation - never fallback to mock data on real API errors
        return throwError(() => error);
      })
    );
  }

  /**
   * Retrieves single traveler detail by ID.
   */
  getTravelerById(id: number): Observable<TravelerAccount> {
    if (this.authService.isDemoSession()) {
      try {
        const result = this.previewState.getTraveler(id);
        if (!result) {
          return throwError(() => ({
            status: 404,
            statusText: 'Not Found',
            error: { detail: `Traveler #${id} not found.` },
          }));
        }
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http.get<TravelerAccount>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Retrieves audit status history for a traveler.
   */
  getTravelerHistory(travelerId: number): Observable<TravelerStatusEvent[]> {
    if (this.authService.isDemoSession()) {
      try {
        const result = this.previewState.getTravelerHistory(travelerId);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http.get<TravelerStatusEvent[]>(`${this.baseUrl}/${travelerId}/history`).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  /**
   * Mutates traveler account status (PATCH /api/v1/admin/travelers/{id}/status).
   * Backend strictly requires Super Admin (`require_super_admin`).
   */
  updateTravelerStatus(
    travelerId: number,
    payload: TravelerStatusUpdate
  ): Observable<TravelerAccount> {
    if (this.authService.isDemoSession()) {
      try {
        const result = this.previewState.updateTravelerStatus(travelerId, payload);
        return of(result);
      } catch (err) {
        return throwError(() => err);
      }
    }

    return this.http
      .patch<TravelerAccount>(`${this.baseUrl}/${travelerId}/status`, payload)
      .pipe(catchError((error) => throwError(() => error)));
  }
}
