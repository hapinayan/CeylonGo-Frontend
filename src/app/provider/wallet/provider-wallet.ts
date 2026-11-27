import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import {
  TopUpResult,
  WalletSummary,
  WalletTransactionItem,
  WalletTransactionType,
  formatLkr,
  formatRatePercent,
  parseWalletApiError,
} from '../../core/models/wallet.models';
import { WalletService } from '../../core/services/wallet.service';
import { WalletTransactionsTableComponent } from '../../shared/components/wallet-transactions-table/wallet-transactions-table';
import { ProviderPreviewService } from '../provider-preview.service';
import { WalletTopupModalComponent } from './components/wallet-topup-modal/wallet-topup-modal';

@Component({
  selector: 'app-provider-wallet',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WalletTopupModalComponent,
    WalletTransactionsTableComponent,
  ],
  templateUrl: './provider-wallet.html',
  styleUrl: './provider-wallet.scss',
})
export class ProviderWallet implements OnInit {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly walletService = inject(WalletService);
  private readonly previewService = inject(ProviderPreviewService);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoadingSummary = signal<boolean>(true);
  readonly summaryError = signal<string | null>(null);
  readonly summary = signal<WalletSummary | null>(null);

  readonly isLoadingTransactions = signal<boolean>(true);
  readonly transactionsError = signal<string | null>(null);
  readonly transactions = signal<WalletTransactionItem[]>([]);
  readonly totalTransactions = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = 15;
  readonly selectedTransactionType = signal<WalletTransactionType | ''>('');

  readonly isTopupModalOpen = signal<boolean>(false);
  readonly statusMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWalletData();
    if (!this.isPreview() && this.route?.snapshot.queryParamMap.get('topUp') === 'true') {
      this.openTopupModal();
    }
  }

  loadWalletData(): void {
    this.loadSummary();
    this.loadTransactions();
  }

  loadSummary(): void {
    this.isLoadingSummary.set(true);
    this.summaryError.set(null);

    this.walletService.getWalletSummary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.isLoadingSummary.set(false);
      },
      error: (err) => {
        const parsed = parseWalletApiError(err, 'Failed to load provider wallet summary.');
        this.summaryError.set(parsed.message);
        this.isLoadingSummary.set(false);
      },
    });
  }

  loadTransactions(): void {
    this.isLoadingTransactions.set(true);
    this.transactionsError.set(null);

    this.walletService
      .getTransactions({
        page: this.page(),
        page_size: this.pageSize,
        transaction_type: this.selectedTransactionType(),
      })
      .subscribe({
        next: (res) => {
          this.transactions.set(Array.isArray(res.items) ? res.items : []);
          this.totalTransactions.set(typeof res.total === 'number' ? res.total : 0);
          this.isLoadingTransactions.set(false);
        },
        error: (err) => {
          const parsed = parseWalletApiError(err, 'Failed to load wallet transactions.');
          this.transactionsError.set(parsed.message);
          this.isLoadingTransactions.set(false);
        },
      });
  }

  onTypeFilterChange(type: WalletTransactionType | ''): void {
    this.selectedTransactionType.set(type);
    this.page.set(1);
    this.loadTransactions();
  }

  onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.loadTransactions();
  }

  openTopupModal(): void {
    this.statusMessage.set(null);
    this.isTopupModalOpen.set(true);
  }

  closeTopupModal(): void {
    this.isTopupModalOpen.set(false);
  }

  onTopUpRecorded(result: TopUpResult): void {
    if (result.success) {
      this.statusMessage.set(
        `Wallet topped up successfully. Updated balance: ${formatLkr(result.balance)}.`
      );
      this.page.set(1);
      this.loadWalletData();
    } else {
      // Refresh transactions so failed simulated attempt appears in ledger
      this.page.set(1);
      this.loadTransactions();
    }
  }

  formatLkr(val: string | number | null | undefined): string {
    return formatLkr(val);
  }

  formatRate(rate: string | number | null | undefined): string {
    return formatRatePercent(rate);
  }

  freeAllowancePercent(used: number): number {
    return Math.min(100, Math.max(0, (used / 3) * 100));
  }
}
