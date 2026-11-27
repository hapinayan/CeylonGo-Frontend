export type HomestayCategory =
  | 'all'
  | 'mountain'
  | 'beach'
  | 'nature'
  | 'cultural'
  | 'eco'
  | 'family'
  | 'budget'
  // Backward-compatible category aliases
  | 'beachfront'
  | 'hill-country'
  | 'heritage'
  | 'village'
  | 'eco-nature'
  | 'lakeside'
  | 'city';

export interface HomestayCategoryFilter {
  id: HomestayCategory;
  name: string;
  icon: string;
  count: number;
}

export interface HomestayImage {
  id: number;
  storage_key?: string;
  sort_order?: number;
  alt_text?: string | null;
  image_url?: string | null;
  is_primary?: boolean;
}

export interface HomestayAmenity {
  id: number;
  name: string;
  icon?: string;
}

export interface HomestayReview {
  id: number;
  author: string;
  avatar?: string;
  date: string;
  rating: number;
  comment: string;
}

export interface HomestayHighlight {
  title: string;
  desc: string;
  icon: string;
}

export interface HomestaySummary {
  id: number;
  name: string;
  description: string;
  location: string;
  city: string;
  district: string;
  province?: string;
  category: HomestayCategory;
  category_name: string;
  price_per_night: number;
  original_price_per_night?: number;
  discount_percent?: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_superhost?: boolean;
  is_guest_favorite?: boolean;
  latitude?: number;
  longitude?: number;
  image_url: string;
  images: string[];
  amenities: string[];
  cancellation_policy: string;
  free_cancellation_hours?: number;
  host_name?: string;
  host_avatar?: string;
  is_wishlisted?: boolean;
  units?: InventoryUnitResponse[];
  available_rooms?: InventoryUnitResponse[];
  host?: HomestayHost;
  quote?: HomestayQuote;
  selected_unit_id?: number;
  has_media?: boolean;
  // Detail-level properties
  house_rules?: string[];
  check_in_time?: string;
  check_out_time?: string;
  host_bio?: string;
  host_joined?: string;
  host_response_rate?: string;
  host_response_time?: string;
  highlights?: HomestayHighlight[];
  reviews?: HomestayReview[];
  neighborhood?: string;
  landmarks?: string[];
}

export type HomestayDetail = HomestaySummary;

export interface BookingDraft {
  homestayId: number;
  homestayName: string;
  homestayLocation: string;
  homestayImage: string;
  nightlyRate: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children: number;
  totalGuests: number;
  nights: number;
  basePrice: number;
  estimatedTotal: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  specialRequests?: string;
  selectedUnitId?: number;
  selectedUnitLabel?: string;
  selectedUnitCapacity?: number;
  paymentMethod?: 'at_location' | 'online';
}

export interface BookingConfirmation {
  id?: number;
  bookingReference: string;
  homestayId: number;
  homestayName: string;
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  nights: number;
  estimatedTotal: number;
  hostName: string;
  confirmedAt: string;
  paymentStatus?: string;
  paymentMethod?: string;
  currency?: string;
}

// =============================================================================
// BACKEND FASTAPI INTEGRATION CONTRACTS (CODEX MVP)
// =============================================================================

export interface HomestayHost {
  id: number;
  business_name: string;
}


export interface InventoryUnitResponse {
  id: number;
  listing_id?: number;
  label: string;
  capacity: number;
  is_active: boolean;
  notes?: string | null;
}

export interface HomestayDetails {
  id: number;
  provider_id: number;
  category: string;
  title: string;
  description: string;
  district: string;
  locality: string;
  latitude: string | null;
  longitude: string | null;
  price: string;
  currency: string;
  approval_status: string;
  is_active: boolean;
  media: HomestayImage[];
  units: InventoryUnitResponse[];
  created_at: string;
  host: HomestayHost;
  property_type?: 'house' | 'apartment' | 'bungalow' | 'villa' | 'guesthouse' | 'cottage' | 'other' | null;
  amenities: string[];
}

export interface HomestayPage {
  items: HomestayDetails[];
  next_before_id: number | null;
}

export interface HomestayQuote {
  check_in: string;
  check_out: string;
  listing_id: number;
  nights: number;
  nightly_rate: string;
  total_amount: string;
  currency: string;
  available_rooms: InventoryUnitResponse[];
}

export interface WishlistState {
  listing_id: number;
  saved: boolean;
}

export interface HomestayBookingRequest {
  check_in: string;
  check_out: string;
  guests: number;
  room_id: number;
  request_key: string;
  expected_total?: string | number | null;
}

export interface HomestayBookingDetails {
  id: number;
  listing_id: number;
  traveler_id: number;
  request_key: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
  total_amount: string;
  currency: string;
  status: string;
  created_at: string;
  room_ids: number[];
  payments: PaymentResponse[];
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

export interface PaymentResponse {
  id: number;
  booking_id: number;
  request_key: string;
  attempt_no: number;
  method: string;
  status: string;
  display_amount: string;
  currency: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface LegacyBookingCreateRequest {
  listing_id: number;
  starts_at: string;
  ends_at: string;
  quantity: number;
  request_key: string;
  room_id?: number;
}

// Backward compatibility aliases
export type ListingResponse = HomestayDetails;
export type BookingCreateRequest = HomestayBookingRequest | LegacyBookingCreateRequest;
export type BookingResponse = HomestayBookingDetails;

export interface HomestaySearchParams {
  destination?: string;
  query?: string;
  location?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  category?: HomestayCategory;
  property_type?: 'house' | 'apartment' | 'bungalow' | 'villa' | 'guesthouse' | 'cottage' | 'other';
  min_price?: number | string;
  max_price?: number | string;
  sort_by?: 'popular' | 'recommended' | 'price_low' | 'price_high' | 'rating' | 'reviews';
  amenities?: string[];
  is_verified?: boolean;
  limit?: number;
  before_id?: number;
  page?: number;
  page_size?: number;
}

export interface HomestayListResponse {
  items: HomestaySummary[];
  next_before_id?: number | null;
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}
