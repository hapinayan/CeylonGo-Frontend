import {
  AdminWalletTotals,
  TransactionPage,
  WalletPage,
  WalletSummary,
  WalletTransactionItem,
  WalletTransactionQuery,
  WalletTransactionType,
} from '../../../core/models/wallet.models';

export type {
  AdminWalletTotals,
  TransactionPage,
  WalletPage,
  WalletSummary,
  WalletTransactionItem,
  WalletTransactionQuery,
  WalletTransactionType,
};

export interface AdminMvpProviderSummary {
  id: number;
  user_id: number;
  business_name: string;
  phone: string;
  district: string;
  verification_status: string;
}

export interface AdminWalletDirectoryItem extends WalletSummary {
  business_name?: string;
  district?: string;
  verification_status?: string;
}
