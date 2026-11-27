export type BookingCategory = 'all' | 'homestay' | 'tour_guide' | 'rental' | 'activity' | 'artisan';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'refund_pending'
  | 'failed';

export type PaymentStatus = 'pending' | 'captured' | 'failed' | 'refunded' | 'cash_on_delivery';

export interface AdminBookingListItem {
  id: number | string;
  booking_reference: string;
  category: BookingCategory;
  traveler_id: number;
  traveler_name: string;
  traveler_email: string;
  traveler_phone?: string;
  provider_id: number;
  provider_name: string;
  provider_business_name?: string;
  service_title: string;
  start_date: string;
  end_date?: string;
  amount: number;
  currency: string;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  created_at: string;
}

export interface AdminBookingDetailResponse extends AdminBookingListItem {
  special_requests?: string;
  number_of_guests?: number;
  cancellation_policy?: string;
  security_deposit?: number;
  cancellation_reason?: string;
  location_name?: string;
  district?: string;
  province?: string;
  audit_history?: Array<{
    status: string;
    changed_at: string;
    changed_by?: string;
    notes?: string;
  }>;
}

export interface BookingQueryParams {
  category?: BookingCategory | string;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface AdminBookingKPIs {
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  cancelled_or_disputed: number;
}
