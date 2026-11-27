import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  WalletTransactionItem,
  WalletTransactionType,
  formatLkr,
  toAmountNumber,
} from '../../../core/models/wallet.models';

@Component({
  selector: 'app-wallet-transactions-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet-transactions-table.html',
  styleUrl: './wallet-transactions-table.scss',
})
export class WalletTransactionsTableComponent {
  readonly transactions = input<WalletTransactionItem[]>([]);
  readonly total = input<number>(0);
  readonly page = input<number>(1);
  readonly pageSize = input<number>(10);
  readonly selectedType = input<WalletTransactionType | ''>('');
  readonly isLoading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly emptyMessage = input<string>('No wallet transactions recorded yet.');

  readonly typeFilterChange = output<WalletTransactionType | ''>();
  readonly pageChange = output<number>();
  readonly retry = output<void>();

  readonly filterOptions: readonly { value: WalletTransactionType | ''; label: string }[] = [
    { value: '', label: 'All Transactions' },
    { value: 'top_up', label: 'Wallet Top-Ups' },
    { value: 'commission_deduction', label: 'Commission Deductions' },
    { value: 'commission_refund', label: 'Commission Refunds' },
    { value: 'free_booking', label: 'Commission-Free Bookings' },
  ];

  totalPages(): number {
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(this.total() / size));
  }

  onTypeChange(value: string): void {
    this.typeFilterChange.emit((value || '') as WalletTransactionType | '');
  }

  goToPage(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.totalPages() || nextPage === this.page()) {
      return;
    }
    this.pageChange.emit(nextPage);
  }

  transactionRef(tx: WalletTransactionItem): string {
    return `TX-${tx.id}`;
  }

  shortRequestKey(tx: WalletTransactionItem): string | null {
    if (!tx.request_key) return null;
    return tx.request_key.slice(0, 8);
  }

  bookingRef(tx: WalletTransactionItem): string {
    if (tx.booking_id !== null && tx.booking_id !== undefined) {
      return `Booking #${tx.booking_id}`;
    }
    return '—';
  }

  typeLabel(tx: WalletTransactionItem): string {
    switch (tx.transaction_type) {
      case 'top_up':
        return tx.simulate_outcome === 'failure' ? 'Top-Up Failed (Demo)' : 'Wallet Top-Up';
      case 'commission_deduction':
        return 'Commission Deducted';
      case 'commission_refund':
        return 'Commission Refunded';
      case 'free_booking':
        return 'Commission-Free Booking';
      default:
        return tx.transaction_type;
    }
  }

  typeBadgeClass(tx: WalletTransactionItem): string {
    if (tx.transaction_type === 'top_up') {
      return tx.simulate_outcome === 'failure' ? 'badge-failed' : 'badge-credit';
    }
    if (tx.transaction_type === 'commission_deduction') {
      return 'badge-debit';
    }
    if (tx.transaction_type === 'commission_refund') {
      return 'badge-refund';
    }
    return 'badge-free';
  }

  amountDisplay(tx: WalletTransactionItem): string {
    const formatted = formatLkr(tx.amount);
    if (tx.transaction_type === 'top_up') {
      return tx.simulate_outcome === 'failure' ? `${formatted} (Not Credited)` : `+ ${formatted}`;
    }
    if (tx.transaction_type === 'commission_refund') {
      return `+ ${formatted}`;
    }
    if (tx.transaction_type === 'commission_deduction') {
      return `- ${formatted}`;
    }
    return 'LKR 0.00 (Free)';
  }

  amountClass(tx: WalletTransactionItem): string {
    if (tx.transaction_type === 'top_up') {
      return tx.simulate_outcome === 'failure' ? 'amount-failed' : 'amount-credit';
    }
    if (tx.transaction_type === 'commission_refund') {
      return 'amount-refund';
    }
    if (tx.transaction_type === 'commission_deduction') {
      return 'amount-debit';
    }
    return 'amount-free';
  }

  balanceAfterDisplay(tx: WalletTransactionItem): string {
    return formatLkr(tx.balance_after);
  }

  hasCommissionMeta(tx: WalletTransactionItem): boolean {
    return tx.booking_amount !== null && tx.booking_amount !== undefined && toAmountNumber(tx.booking_amount) > 0;
  }

  formatAmount(val: string | number | null | undefined): string {
    return formatLkr(val);
  }
}
