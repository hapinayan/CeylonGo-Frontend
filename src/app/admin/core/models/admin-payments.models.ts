/**
 * Module 12 — Payments & Refunds Models
 * Matches backend `payments.py` and administrative reconciliation contracts.
 */

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded' | 'partially_refunded' | 'disputed' | 'cash_on_delivery';
export type RefundStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'completed';
export type PaymentServiceCategory = 'homestay' | 'tour_guide' | 'rental' | 'activity' | 'artisan';

export interface AdminFinancialSummaryResponse {
  total_gross_booking_revenue: number;
  total_ceylongo_commission: number;
  total_provider_liabilities: number;
  total_verified_refunds: number;
  total_settled_payouts: number;
  pending_settlement_payouts: number;
  total_advertising_revenue: number;
  currency: string;
}

export interface AdminPaymentTransactionItem {
  id: number;
  transaction_reference: string;
  booking_reference: string;
  category: PaymentServiceCategory;
  traveler_id: number;
  traveler_name: string;
  provider_id: number;
  provider_name: string;
  amount: number;
  commission_amount?: number;
  net_provider_amount?: number;
  currency: string;
  payment_method: string;
  payment_status: PaymentStatus;
  refund_status: RefundStatus | null;
  refund_amount?: number;
  created_at: string;
  updated_at?: string;
  reconciliation_flag?: boolean;
}

export interface PaymentQueryParams {
  status?: string;
  category?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
