import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminMvpProviderSummary,
  AdminWalletTotals,
  TransactionPage,
  WalletPage,
  WalletSummary,
  WalletTransactionQuery,
} from '../models/admin-wallet.models';
import { canViewFinancialMetrics, canViewPayments } from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminWalletService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);

  private readonly baseUrl = `${environment.apiBaseUrl}/admin/wallets`;
  private readonly providersUrl = `${environment.apiBaseUrl}/admin/providers`;

  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewWallets = computed(
    () => canViewPayments(this.currentUser()) || canViewFinancialMetrics(this.currentUser())
  );

  /**
   * Read-only platform wallet & commission totals.
   * Endpoint: GET /api/v1/admin/wallets/summary
   */
  getWalletSummary(): Observable<AdminWalletTotals> {
    return this.http.get<AdminWalletTotals>(`${this.baseUrl}/summary`);
  }

  /**
   * Read-only paginated provider wallet directory.
   * Endpoint: GET /api/v1/admin/wallets
   */
  getWallets(page = 1, pageSize = 25): Observable<WalletPage> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));
    return this.http.get<WalletPage>(this.baseUrl, { params });
  }

  /**
   * Read-only single provider wallet summary.
   * Endpoint: GET /api/v1/admin/wallets/{provider_id}
   */
  getProviderWallet(providerId: number): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(`${this.baseUrl}/${providerId}`);
  }

  /**
   * Read-only paginated transaction ledger for a specific provider wallet.
   * Endpoint: GET /api/v1/admin/wallets/{provider_id}/transactions
   */
  getProviderTransactions(
    providerId: number,
    query: WalletTransactionQuery = {}
  ): Observable<TransactionPage> {
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

    return this.http.get<TransactionPage>(`${this.baseUrl}/${providerId}/transactions`, {
      params,
    });
  }

  /**
   * Best-effort lookup of provider business names & districts for directory display.
   * Endpoint: GET /api/v1/admin/providers
   */
  getProviderDirectoryLookup(): Observable<AdminMvpProviderSummary[]> {
    const params = new HttpParams().set('limit', '100').set('offset', '0');
    return this.http
      .get<AdminMvpProviderSummary[]>(this.providersUrl, { params })
      .pipe(catchError(() => of([])));
  }
}
