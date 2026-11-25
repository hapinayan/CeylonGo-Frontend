export type ListingCategory =
  | 'homestay'
  | 'bike'
  | 'bicycle'
  | 'adventure'
  | 'guide'
  | 'artisan';

export type VerificationStatus =
  | 'draft'
  | 'pending'
  | 'more_evidence_required'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type PropertyType =
  | 'house'
  | 'apartment'
  | 'bungalow'
  | 'villa'
  | 'guesthouse'
  | 'cottage'
  | 'other';

export type EvidenceLinkKind =
  | 'maps'
  | 'facebook'
  | 'instagram'
  | 'website'
  | 'booking_com'
  | 'airbnb'
  | 'video'
  | 'other';

export type EvidenceFileKind =
  | 'customer_feedback'
  | 'business_certificate'
  | 'ownership'
  | 'authorization'
  | 'video'
  | 'safety'
  | 'credentials'
  | 'license'
  | 'workshop'
  | 'other';

export interface ListingCreateDraftRequest {
  category: ListingCategory;
}

export interface ListingDraftUpdate {
  category?: ListingCategory | null;
  title?: string | null;
  description?: string | null;
  province?: string | null;
  district?: string | null;
  locality?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  price?: number | string | null;
  house_rules?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  contact?: string | null;
  metadata?: HomestayMetadataPayload | null;
}

export interface HomestayMetadataPayload {
  property_type: PropertyType | null;
  amenities: string[];
}

export interface ListingMediaResponse {
  id: number;
  storage_key: string;
  sort_order: number;
  alt_text?: string | null;
  image_url?: string | null;
}

export interface EvidenceLink {
  kind: EvidenceLinkKind;
  url: string;
}

export interface EvidenceUpdate {
  links: EvidenceLink[];
  notes: string;
}

export interface EvidenceFileResponse {
  id: string;
  kind: EvidenceFileKind;
  media_type: string;
  redacted?: boolean | null;
  filename?: string;
  file_size?: number;
}

export interface RoomUpdate {
  label: string;
  capacity: number;
  nightly_price: string;
  room_type?: string | null;
  description?: string | null;
  photo_ids?: number[] | null;
}

export interface HomestayRoom {
  id: number;
  listing_id: number;
  label: string;
  capacity: number;
  is_active: boolean;
  room_type?: string | null;
  description?: string | null;
  nightly_price?: string | null;
  photo_ids: number[];
}

export interface AvailabilitySlotCreate {
  unit_id: number;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_open: boolean;
}

export interface AvailabilitySlotResponse {
  id: number;
  unit_id: number;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_open: boolean;
  created_at?: string;
}

export interface ListingResponse {
  id: number;
  provider_id: number;
  category: string;
  title: string;
  description: string;
  district: string;
  locality: string;
  latitude?: string | null;
  longitude?: string | null;
  price: string;
  currency: string;
  approval_status: string;
  is_active: boolean;
  media: ListingMediaResponse[];
  units: any[];
  created_at: string;
}

export interface ReviewListing {
  listing: ListingResponse;
  verification_status: VerificationStatus;
  submitted_at: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  details: Record<string, any>;
  homestay_metadata: HomestayMetadataPayload | null;
  rooms: HomestayRoom[];
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
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  created_at: string;
  room_ids: number[];
  payments: any[];
}

export interface BookingStatusUpdateRequest {
  to_status: 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  reason?: string | null;
}

export interface ProviderDashboardStats {
  total_listings: number;
  published_listings: number;
  pending_approvals: number;
  total_bookings: number;
}

export interface HomestayDraftState {
  listingId: number | null;
  step: number;
  basicInfo: {
    title: string;
    property_type: PropertyType;
    description: string;
    contact: string;
    house_rules: string;
    check_in_time: string;
    check_out_time: string;
  };
  location: {
    province: string;
    district: string;
    locality: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  photos: ListingMediaResponse[];
  amenities: string[];
  rooms: RoomUpdate[];
  evidence: {
    links: EvidenceLink[];
    notes: string;
    files: EvidenceFileResponse[];
  };
  lastSavedAt: string;
}

export interface ProviderBookingItem {
  id: number;
  listing_id?: number;
  listing_title: string;
  room_label?: string;
  traveler_id?: number;
  traveler_name: string;
  traveler_email: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  payment_status: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ProviderListingItem {
  id: number;
  title: string;
  category: ListingCategory;
  approval_status: string;
  is_active: boolean;
  locality?: string;
  district?: string;
  base_price?: number;
  rating?: number;
  cover_image?: string | null;
  rooms_count?: number;
}
