import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  formatLkr,
  formatRatePercent,
  parseWalletApiError,
} from '../../../core/models/wallet.models';
import { WalletTransactionsTableComponent } from '../../../shared/components/wallet-transactions-table/wallet-transactions-table';
import {
  AdminMvpProviderSummary,
  AdminWalletDirectoryItem,
  AdminWalletTotals,
  WalletSummary,
  WalletTransactionItem,
  WalletTransactionType,
} from '../../core/models/admin-wallet.models';
import { AdminWalletService } from '../../core/services/admin-wallet.service';

@Component({
  selector: 'app-admin-wallets',
  standalone: true,
  imports: [CommonModule, WalletTransactionsTableComponent],
  templateUrl: './admin-wallets.component.html',
  styleUrl: './admin-wallets.component.scss',
})
export class AdminWalletsComponent implements OnInit {
  private readonly adminWalletService = inject(AdminWalletService);

  readonly canView = this.adminWalletService.canViewWallets;

  readonly isLoadingSummary = signal<boolean>(true);
  readonly summaryError = signal<string | null>(null);
  readonly summary = signal<AdminWalletTotals | null>(null);

  readonly isLoadingDirectory = signal<boolean>(true);
  readonly directoryError = signal<string | null>(null);
  readonly wallets = signal<AdminWalletDirectoryItem[]>([]);
  readonly directoryPage = signal<number>(1);
  readonly directoryPageSize = 15;
  readonly directoryTotal = signal<number>(0);
  readonly providerLookup = signal<Record<number, AdminMvpProviderSummary>>({});

  readonly selectedProviderId = signal<number | null>(null);
  readonly isLoadingDetail = signal<boolean>(false);
  readonly detailError = signal<string | null>(null);
  readonly selectedWalletDetail = signal<WalletSummary | null>(null);

  readonly isLoadingTransactions = signal<boolean>(false);
  readonly transactionsError = signal<string | null>(null);
  readonly transactions = signal<WalletTransactionItem[]>([]);
  readonly transactionsTotal = signal<number>(0);
  readonly transactionsPage = signal<number>(1);
  readonly transactionsPageSize = 15;
  readonly selectedTransactionType = signal<WalletTransactionType | ''>('');

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.loadSummary();
    this.loadDirectory();
  }

  loadSummary(): void {
    this.isLoadingSummary.set(true);
    this.summaryError.set(null);

    this.adminWalletService.getWalletSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoadingSummary.set(false);
      },
      error: (err) => {
        const parsed = parseWalletApiError(
          err,
          'Failed to load platform wallet and commission summary.'
        );
        this.summaryError.set(parsed.message);
        this.isLoadingSummary.set(false);
      },
    });
  }

  loadDirectory(): void {
    this.isLoadingDirectory.set(true);
    this.directoryError.set(null);

    forkJoin({
      walletPage: this.adminWalletService.getWallets(
        this.directoryPage(),
        this.directoryPageSize
      ),
      providers: this.adminWalletService
        .getProviderDirectoryLookup()
        .pipe(catchError(() => of([] as AdminMvpProviderSummary[]))),
    }).subscribe({
      next: ({ walletPage, providers }) => {
        const lookup: Record<number, AdminMvpProviderSummary> = { ...this.providerLookup() };
        for (const provider of providers) {
          lookup[provider.id] = provider;
        }
        this.providerLookup.set(lookup);

        const items = (walletPage.items || []).map((wallet) => {
          const meta = lookup[wallet.provider_id];
          return {
            ...wallet,
            business_name: meta?.business_name,
            district: meta?.district,
            verification_status: meta?.verification_status,
          };
        });

        this.wallets.set(items);
        this.directoryTotal.set(typeof walletPage.total === 'number' ? walletPage.total : 0);
        this.isLoadingDirectory.set(false);
      },
      error: (err) => {
        const parsed = parseWalletApiError(err, 'Failed to load provider wallet directory.');
        this.directoryError.set(parsed.message);
        this.isLoadingDirectory.set(false);
      },
    });
  }

  directoryTotalPages(): number {
    return Math.max(1, Math.ceil(this.directoryTotal() / this.directoryPageSize));
  }

  goToDirectoryPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.directoryTotalPages() || nextPage === this.directoryPage()) {
      return;
    }
    this.directoryPage.set(nextPage);
    this.loadDirectory();
  }

  selectProvider(providerId: number): void {
    this.selectedProviderId.set(providerId);
    this.selectedTransactionType.set('');
    this.transactionsPage.set(1);
    this.loadProviderDetail(providerId);
    this.loadProviderTransactions(providerId);
  }

  clearSelection(): void {
    this.selectedProviderId.set(null);
    this.selectedWalletDetail.set(null);
    this.detailError.set(null);
    this.transactions.set([]);
    this.transactionsTotal.set(0);
    this.transactionsError.set(null);
  }

  loadProviderDetail(providerId: number): void {
    this.isLoadingDetail.set(true);
    this.detailError.set(null);

    this.adminWalletService.getProviderWallet(providerId).subscribe({
      next: (wallet) => {
        this.selectedWalletDetail.set(wallet);
        this.isLoadingDetail.set(false);
      },
      error: (err) => {
        const parsed = parseWalletApiError(err, 'Failed to load provider wallet details.');
        this.detailError.set(parsed.message);
        this.isLoadingDetail.set(false);
      },
    });
  }

  loadProviderTransactions(providerId: number): void {
    this.isLoadingTransactions.set(true);
    this.transactionsError.set(null);

    this.adminWalletService
      .getProviderTransactions(providerId, {
        page: this.transactionsPage(),
        page_size: this.transactionsPageSize,
        transaction_type: this.selectedTransactionType(),
      })
      .subscribe({
        next: (res) => {
          this.transactions.set(Array.isArray(res.items) ? res.items : []);
          this.transactionsTotal.set(typeof res.total === 'number' ? res.total : 0);
          this.isLoadingTransactions.set(false);
        },
        error: (err) => {
          const parsed = parseWalletApiError(
            err,
            'Failed to load provider wallet transaction history.'
          );
          this.transactionsError.set(parsed.message);
          this.isLoadingTransactions.set(false);
        },
      });
  }

  onTransactionTypeChange(type: WalletTransactionType | ''): void {
    const providerId = this.selectedProviderId();
    if (providerId === null) return;
    this.selectedTransactionType.set(type);
    this.transactionsPage.set(1);
    this.loadProviderTransactions(providerId);
  }

  onTransactionPageChange(nextPage: number): void {
    const providerId = this.selectedProviderId();
    if (providerId === null) return;
    this.transactionsPage.set(nextPage);
    this.loadProviderTransactions(providerId);
  }

  retrySelectedTransactions(): void {
    const providerId = this.selectedProviderId();
    if (providerId === null) return;
    this.loadProviderTransactions(providerId);
  }

  providerLabel(providerId: number): string {
    const meta = this.providerLookup()[providerId];
    return meta?.business_name ? `${meta.business_name} (#${providerId})` : `Provider #${providerId}`;
  }

  formatLkr(val: string | number | null | undefined): string {
    return formatLkr(val);
  }

  formatRate(rate: string | number | null | undefined): string {
    return formatRatePercent(rate);
  }
}
