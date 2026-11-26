import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminFinancialSummaryResponse,
  AdminPaymentTransactionItem,
  PaymentQueryParams,
} from '../models/admin-payments.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import { canManageFinances, canViewPayments } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);

  private readonly baseUrl = `${environment.apiBaseUrl}/payments`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewPayments = computed(() => canViewPayments(this.currentUser()));
  readonly canManageFinances = computed(() => canManageFinances(this.currentUser()));

  getFinancialSummary(): Observable<AdminFinancialSummaryResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getFinancialSummary());
    }
    return this.http.get<AdminFinancialSummaryResponse>(`${this.baseUrl}/admin/summary`);
  }

  getPayments(params: PaymentQueryParams = {}): Observable<{
    items: AdminPaymentTransactionItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getPayments(params));
    }

    let httpParams = new HttpParams();
    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.category && params.category !== 'all') {
      httpParams = httpParams.set('category', params.category);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.page_size) {
      httpParams = httpParams.set('page_size', params.page_size.toString());
    }

    return this.http.get<{
      items: AdminPaymentTransactionItem[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>(`${this.baseUrl}/admin/reconciliation-queue`, { params: httpParams });
  }
}
