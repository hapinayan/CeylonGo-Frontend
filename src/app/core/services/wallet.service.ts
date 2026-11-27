import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProviderPreviewService } from '../../provider/provider-preview.service';
import {
  CommissionPreview,
  TopUpRequest,
  TopUpResult,
  TransactionPage,
  WalletSummary,
  WalletTransactionQuery,
  generateCanonicalUuidV4,
} from '../models/wallet.models';
import { ProviderAuthService } from './provider-auth.service';

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly http = inject(HttpClient);
  private readonly providerAuth = inject(ProviderAuthService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly baseUrl = environment.apiBaseUrl;

  private isPreviewMode(): boolean {
    return this.previewService?.isPreview?.() ?? false;
  }

  private previewBlocked<T>(action = 'Wallet operations'): Observable<T> {
    return throwError(() => ({
      status: 403,
      error: {
        detail: `${action} require an authenticated provider session and are disabled in Preview Mode.`,
      },
    }));
  }

  private getAuthHeaders(): HttpHeaders {
    const token =
      typeof this.providerAuth?.getToken === 'function' ? this.providerAuth.getToken() : null;
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  generateRequestKey(): string {
    return generateCanonicalUuidV4();
  }

  /**
   * Retrieve authenticated provider wallet summary.
   * Endpoint: GET /api/v1/provider/wallet
   */
  getWalletSummary(): Observable<WalletSummary> {
    if (this.isPreviewMode()) {
      return this.previewBlocked('Provider wallet balances');
    }
    return this.http.get<WalletSummary>(`${this.baseUrl}/provider/wallet`, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Perform simulated wallet top-up with canonical UUID idempotency key.
   * Endpoint: POST /api/v1/provider/wallet/top-up
   */
  topUpWallet(payload: TopUpRequest): Observable<TopUpResult> {
    if (this.isPreviewMode()) {
      return this.previewBlocked('Simulated wallet top-ups');
    }
    return this.http.post<TopUpResult>(`${this.baseUrl}/provider/wallet/top-up`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Retrieve paginated wallet transaction history with optional filters.
   * Endpoint: GET /api/v1/provider/wallet/transactions
   */
  getTransactions(query: WalletTransactionQuery = {}): Observable<TransactionPage> {
    if (this.isPreviewMode()) {
      return this.previewBlocked('Wallet transaction history');
    }
    let params = new HttpParams();
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.page_size) {
      params = params.set('page_size', String(query.page_size));
    }
    if (query.transaction_type) {
      params = params.set('transaction_type', query.transaction_type);
    }
    if (query.date_from) {
      params = params.set('date_from', query.date_from);
    }
    if (query.date_to) {
      params = params.set('date_to', query.date_to);
    }

    return this.http.get<TransactionPage>(`${this.baseUrl}/provider/wallet/transactions`, {
      headers: this.getAuthHeaders(),
      params,
    });
  }

  /**
   * Retrieve commission preview before confirming a pending booking.
   * Endpoint: GET /api/v1/provider/bookings/{booking_id}/commission-preview
   */
  getBookingCommissionPreview(bookingId: number): Observable<CommissionPreview> {
    if (this.isPreviewMode()) {
      return this.previewBlocked('Booking commission preview');
    }
    return this.http.get<CommissionPreview>(
      `${this.baseUrl}/provider/bookings/${bookingId}/commission-preview`,
      { headers: this.getAuthHeaders() }
    );
  }
}
