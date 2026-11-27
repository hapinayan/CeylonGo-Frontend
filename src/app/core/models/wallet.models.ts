import { HttpErrorResponse } from '@angular/common/http';

export type WalletTransactionType =
  | 'top_up'
  | 'free_booking'
  | 'commission_deduction'
  | 'commission_refund';

export type SimulateOutcome = 'success' | 'failure';

export interface WalletSummary {
  provider_id: number;
  balance: string | number;
  currency: 'LKR';
  commission_rate: string | number;
  free_bookings_used: number;
  free_bookings_remaining: number;
  total_top_ups: string | number;
  total_commission_deducted: string | number;
  total_commission_refunded: string | number;
  net_commission_paid: string | number;
}

export interface WalletTransactionItem {
  id: number;
  booking_id: number | null;
  deduction_id: number | null;
  transaction_type: WalletTransactionType;
  amount: string | number;
  balance_before: string | number;
  balance_after: string | number;
  commission_rate: string | number | null;
  booking_amount: string | number | null;
  request_key: string | null;
  simulate_outcome: SimulateOutcome | null;
  description: string;
  created_at: string;
}

export interface TopUpRequest {
  amount: string;
  request_key: string;
  simulate_outcome: SimulateOutcome;
}

export interface TopUpResult {
  success: boolean;
  currency: 'LKR';
  balance: string | number;
  message: string;
  transaction: WalletTransactionItem;
}

export interface CommissionPreview {
  booking_amount: string | number;
  commission_rate: string | number;
  required_commission: string | number;
  free_booking_eligible: boolean;
  wallet_balance: string | number;
  shortfall: string | number;
  confirmation_allowed: boolean;
  currency: 'LKR';
}

export interface AdminWalletTotals {
  currency: 'LKR';
  total_provider_wallets: number;
  total_wallet_balances: string | number;
  total_top_ups: string | number;
  gross_commission_collected: string | number;
  commission_refunds: string | number;
  net_commission_revenue: string | number;
  total_commission_free_bookings: number;
}

export interface WalletPage {
  page: number;
  page_size: number;
  total: number;
  items: WalletSummary[];
}

export interface TransactionPage {
  page: number;
  page_size: number;
  total: number;
  items: WalletTransactionItem[];
}

export interface WalletTransactionQuery {
  page?: number;
  page_size?: number;
  transaction_type?: WalletTransactionType | '';
  date_from?: string;
  date_to?: string;
}

export interface InsufficientBalanceDetail {
  code: 'insufficient_wallet_balance';
  message: string;
  currency: 'LKR';
  current_balance: string;
  required_commission: string;
  shortfall: string;
}

export interface ParsedWalletError {
  status: number;
  message: string;
  isRetryable: boolean;
  isConflict: boolean;
  insufficientBalance: InsufficientBalanceDetail | null;
}

export function toAmountNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatLkr(value: string | number | null | undefined): string {
  const num = toAmountNumber(value);
  return `LKR ${num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRatePercent(rate: string | number | null | undefined): string {
  const numeric = toAmountNumber(rate);
  const pct = numeric <= 1 ? numeric * 100 : numeric;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

export function generateCanonicalUuidV4(): string {
  const gCrypto = globalThis.crypto;
  if (gCrypto && typeof gCrypto.randomUUID === 'function') {
    return gCrypto.randomUUID().toLowerCase();
  }
  const bytes = new Uint8Array(16);
  if (gCrypto && typeof gCrypto.getRandomValues === 'function') {
    gCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
}

export function parseWalletApiError(
  err: unknown,
  fallback = 'Unable to complete wallet request. Please try again.'
): ParsedWalletError {
  const httpErr = err as Partial<HttpErrorResponse> & {
    error?: { detail?: unknown; message?: string };
    message?: string;
  };
  const status = typeof httpErr?.status === 'number' ? httpErr.status : 0;
  const detail = httpErr?.error?.detail;

  if (
    detail &&
    typeof detail === 'object' &&
    !Array.isArray(detail) &&
    (detail as { code?: unknown }).code === 'insufficient_wallet_balance'
  ) {
    const insufficient = detail as InsufficientBalanceDetail;
    return {
      status,
      message: insufficient.message || 'Top up your wallet before confirming this booking.',
      isRetryable: false,
      isConflict: true,
      insufficientBalance: insufficient,
    };
  }

  let message = fallback;
  if (status === 401) {
    message = 'Your session has expired. Please sign in again.';
  } else if (status === 422 && Array.isArray(detail) && detail.length > 0) {
    const joined = detail
      .map((item: { msg?: string }) => item?.msg || '')
      .filter(Boolean)
      .join('; ');
    message = joined || 'Please verify the entered values and try again.';
  } else if (typeof detail === 'string' && detail.trim()) {
    message = detail;
  } else if (status === 403) {
    message = 'Access denied. An active, authorized account is required.';
  } else if (status === 409) {
    message = 'This request conflicts with the current state. Please review and try again.';
  } else if (status === 422) {
    message = 'Validation error. Please verify your input values.';
  } else if (status === 0) {
    message =
      'Network error: Could not reach the CeylonGo server. You can safely retry without duplicating your request.';
  } else if (status >= 500) {
    message = 'Server error while processing the request. Please retry safely.';
  } else if (typeof httpErr?.error?.message === 'string' && httpErr.error.message.trim()) {
    message = httpErr.error.message;
  } else if (typeof httpErr?.message === 'string' && httpErr.message.trim()) {
    message = httpErr.message;
  }

  return {
    status,
    message,
    isRetryable: status === 0 || status >= 500 || status === 408 || status === 429,
    isConflict: status === 409,
    insufficientBalance: null,
  };
}
