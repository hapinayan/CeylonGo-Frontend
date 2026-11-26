export type ActivityCategorySlug =
  | 'hiking-trekking'
  | 'wildlife-safari'
  | 'water-activities'
  | 'adventure-sports'
  | 'cycling'
  | 'cultural-village'
  | 'food-cooking'
  | 'nature-eco';

export type ActivitySort = 'newest' | 'price_asc' | 'price_desc' | 'title';

export interface ActivityPhoto {
  id: number;
  image_url: string;
  alt_text: string | null;
}

export interface ActivityMetadata {
  category: ActivityCategorySlug;
  meeting_point: string;
  duration_minutes: number;
  min_participants: number;
  max_participants: number;
  minimum_age: number | null;
  highlights: string[];
  included: string[];
  excluded: string[];
  equipment: string | null;
  facilities: string | null;
  safety_instructions: string | null;
  restrictions: string | null;
  cancellation_policy: string | null;
}

export interface ActivityDetails {
  id: number;
  title: string;
  description: string;
  district: string;
  locality: string;
  latitude: string | null;
  longitude: string | null;
  price_per_participant: string;
  currency: 'LKR';
  activity: ActivityMetadata | null;
  photos: ActivityPhoto[];
  provider_id: number;
  provider_name: string;
  rating: null;
  reviews: readonly unknown[];
}

export interface ActivityPage {
  items: ActivityDetails[];
  next_offset: number | null;
}

export interface ActivityDiscoverQuery {
  destination?: string;
  category?: ActivityCategorySlug;
  date?: string;
  participants?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  sort?: ActivitySort;
  limit?: number;
  offset?: number;
}

export interface ActivitySlotDetails {
  id: number;
  date: string;
  starts_at: string;
  ends_at: string;
  remaining_capacity: number;
  available: boolean;
  total_amount: string;
  currency: 'LKR';
}

export interface WishlistStateResponse {
  listing_id: number;
  saved: boolean;
}

export interface ActivityBookingCreateRequest {
  listing_id: number;
  slot_id: number;
  starts_at: string;
  ends_at: string;
  quantity: number;
  expected_total: string;
  request_key: string;
}

export type ActivityBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type ActivityPaymentMethod = 'simulated' | 'at_location';
export type ActivityPaymentStatus = 'unpaid' | 'demo_succeeded' | 'demo_failed' | string;

export interface ActivityPaymentResponse {
  id: number;
  booking_id: number;
  request_key: string;
  attempt_no: number;
  method: ActivityPaymentMethod | string;
  status: ActivityPaymentStatus;
  display_amount: string;
  currency: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface ActivityBookingResponse {
  id: number;
  listing_id: number;
  traveler_id: number;
  request_key: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
  total_amount: string;
  currency: string;
  status: ActivityBookingStatus | string;
  created_at: string;
  booking_reference: string | null;
  slot_id: number | null;
}

export interface ActivityBookingDetailResponse extends ActivityBookingResponse {
  payments: ActivityPaymentResponse[];
}

export interface ActivityBookingStatusUpdateRequest {
  to_status: 'cancelled';
  reason?: string | null;
}

export interface SimulatedPaymentRequest {
  booking_id: number;
  request_key: string;
  attempt_no: number;
  simulate_outcome: 'success' | 'failure';
}

export interface AtLocationPaymentRequest {
  booking_id: number;
  request_key: string;
}
