import { Decimal, EcoSummary } from './eco';

export interface SavedItem {
  id: number;
  user_id: number;
  created_at: string;
  eco_experience_id: number;
  is_available: boolean;
  experience: EcoSummary | null;
}
export interface SavedPage { items: SavedItem[]; total: number; page: number; page_size: number; total_pages: number }

export interface Reservation {
  id: number;
  module: 'eco_experience';
  reference: string;
  experience_id: number;
  slot_id: number;
  participants: number;
  status: string;
  payment_status: string;
  payment_method: 'pay_at_location' | 'online';
  total: Decimal;
  currency: string;
  starts_at: string;
  ends_at: string;
}
export interface ReservationRequest {
  slot_id: number;
  participants: number;
  accepts_safety_rules: boolean;
  participant_ages?: number[];
  sponsored_tracking_token?: string;
}
export interface BookingSlot {
  id: number;
  experience_id: number;
  starts_at: string;
  ends_at: string;
  capacity: number;
  available_places: number;
  is_open: boolean;
}
export interface PaymentStatus {
  booking_id: number;
  booking_status: string;
  payment_method: string;
  payment_status: string;
  total_price: Decimal;
  currency: string;
  paid_at?: string | null;
  transaction_id?: number | null;
}
export interface CheckoutPreparation {
  booking_id: number;
  booking_reference: string;
  merchant_id: string;
  checkout_url: string;
  order_id: string;
  items: string;
  amount: Decimal;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  return_url: string;
  cancel_url: string;
  notify_url: string;
}
