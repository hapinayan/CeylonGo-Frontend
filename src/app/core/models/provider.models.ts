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

export type ActivityCategorySlug =
  | 'hiking-trekking'
  | 'wildlife-safari'
  | 'water-activities'
  | 'adventure-sports'
  | 'cycling'
  | 'cultural-village'
  | 'food-cooking'
  | 'nature-eco';

export const ACTIVITY_CATEGORIES: readonly { slug: ActivityCategorySlug; label: string }[] = [
  { slug: 'hiking-trekking', label: 'Hiking & Trekking' },
  { slug: 'wildlife-safari', label: 'Wildlife Safari' },
  { slug: 'water-activities', label: 'Water Activities' },
  { slug: 'adventure-sports', label: 'Adventure Sports' },
  { slug: 'cycling', label: 'Cycling' },
  { slug: 'cultural-village', label: 'Cultural & Village' },
  { slug: 'food-cooking', label: 'Food & Cooking' },
  { slug: 'nature-eco', label: 'Nature & Eco' },
] as const;

export type GuideCategorySlug =
  | 'cultural_heritage'
  | 'adventure_nature'
  | 'city_village'
  | 'wildlife_eco';

export const GUIDE_BACKEND_CATEGORIES: readonly {
  slug: GuideCategorySlug;
  name: string;
  examples: string;
}[] = [
  {
    slug: 'cultural_heritage',
    name: 'Cultural & Heritage',
    examples: 'Historical sites, temples, museums and heritage tours',
  },
  {
    slug: 'adventure_nature',
    name: 'Adventure & Nature',
    examples: 'Hiking, trekking, waterfalls and nature trails',
  },
  {
    slug: 'city_village',
    name: 'City & Village',
    examples: 'City walks, markets, village visits and sightseeing',
  },
  {
    slug: 'wildlife_eco',
    name: 'Wildlife & Eco',
    examples: 'Birdwatching, wildlife observation and eco guidance',
  },
] as const;

export const GUIDE_DISCOVERY_CATEGORIES: readonly {
  id: string;
  label: string;
  backendSlug: GuideCategorySlug;
}[] = [
  { id: 'nature-hiking', label: 'Nature & Hiking', backendSlug: 'adventure_nature' },
  { id: 'culture-heritage', label: 'Culture & Heritage', backendSlug: 'cultural_heritage' },
  { id: 'sightseeing', label: 'Sightseeing', backendSlug: 'city_village' },
  { id: 'eco-tourism', label: 'Eco-Tourism', backendSlug: 'wildlife_eco' },
  { id: 'beach-coastal', label: 'Beach & Coastal', backendSlug: 'adventure_nature' },
  { id: 'adventure-tours', label: 'Adventure Tours', backendSlug: 'adventure_nature' },
  { id: 'city-tours', label: 'City Tours', backendSlug: 'city_village' },
] as const;

export type GuideProficiencyLevel = 'basic' | 'conversational' | 'fluent' | 'native';

export interface GuideLanguageOption {
  code: string;
  name: string;
}

export const GUIDE_LANGUAGE_OPTIONS: readonly GuideLanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'si', name: 'Sinhala' },
  { code: 'ta', name: 'Tamil' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
] as const;

export interface GuideLanguagePayload {
  language_code: string;
  language_name: string;
  proficiency_level: GuideProficiencyLevel;
  is_primary: boolean;
}

export interface GuideServiceAreaPayload {
  province: string;
  district: string;
  city: string;
  is_primary: boolean;
}

export interface GuideProfileMetadataPayload {
  years_of_experience: number;
  categories: GuideCategorySlug[];
  languages: GuideLanguagePayload[];
  service_areas: GuideServiceAreaPayload[];
  cancellation_policy: string | null;
}

export type GuidePackagePricingType = 'per_person' | 'per_group';

export interface GuidePackagePayload {
  title: string;
  description: string;
  itinerary: string | null;
  duration_hours: string | number;
  pricing_type: GuidePackagePricingType;
  price: string | number;
  currency: 'LKR';
  max_people: number;
  included_services: string | null;
  excluded_services: string | null;
  meeting_point: string;
  meeting_latitude?: string | number | null;
  meeting_longitude?: string | number | null;
  is_active: boolean;
}

export interface GuidePackageDetails extends GuidePackagePayload {
  id: number;
}

export interface ActivityMetadataPayload {
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

export type RentalSubtype =
  | 'motorcycle'
  | 'scooter'
  | 'city'
  | 'mountain'
  | 'road'
  | 'hybrid';

export type RentalTransmission = 'manual' | 'automatic' | 'single_speed';

export interface RentalMetadataPayload {
  subtype: RentalSubtype;
  transmission?: RentalTransmission | null;
  model_year?: number | null;
  seating_capacity?: number | null;
  fuel_type?: string | null;
  specifications?: string | null;
  pickup_name: string;
  pickup_address?: string | null;
  requirements?: string | null;
  rental_terms?: string | null;
  cancellation_policy?: string | null;
}

export interface RentalUnitCreatePayload {
  label: string;
  capacity: number;
}

export interface RentalUnitUpdatePayload {
  label: string;
  is_active: boolean;
}

export interface RentalUnitResponse {
  id: number;
  listing_id: number;
  label: string;
  capacity: number;
  is_active: boolean;
}

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
  | 'activity_photo'
  | 'vehicle_registration'
  | 'insurance'
  | 'vehicle_photo'
  | 'other';

export interface ListingCreateDraftRequest {
  category: ListingCategory;
}

export interface ArtisanOpeningDay {
  day_of_week: number;
  is_closed?: boolean;
  open_time?: string | null;
  close_time?: string | null;
}

export interface ArtisanBusinessPayload {
  craft_category?: string | null;
  business_type?: string | null;
  business_background?: string | null;
  artisan_information?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  website_url?: string | null;
  social_links?: Record<string, string> | null;
  opening_hours?: string | null;
  business_hours?: ArtisanOpeningDay[] | null;
}

export interface ArtisanProductInput {
  title: string;
  category: string;
  description: string;
  materials?: string | null;
  price?: number | string | null;
  is_active: boolean;
}

export interface ArtisanProductImage {
  id: number;
  showcase_item_id: number;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ArtisanProductDetails {
  id: number;
  artisan_listing_id: number;
  listing_title: string;
  title: string;
  category: string;
  description: string;
  materials?: string | null;
  price: number | null;
  currency?: string;
  item_type?: 'product' | 'service';
  image_url: string | null;
  is_available: boolean;
  is_active?: boolean;
  approval_status: string;
  images: ArtisanProductImage[];
  product_images: ArtisanProductImage[];
  created_at: string;
  updated_at: string;
}

export interface ArtisanProductPage {
  items: ArtisanProductDetails[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
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
  activity?: ActivityMetadataPayload | null;
  guide?: GuideProfileMetadataPayload | null;
  rental?: RentalMetadataPayload | null;
  artisan?: ArtisanBusinessPayload | null;
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
  listing_id?: number;
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

export interface TravelerContact {
  full_name: string;
  email: string;
  phone: string | null;
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
  booking_reference?: string | null;
  slot_id?: number | null;
  room_ids: number[];
  payments: any[];
  traveler_contact?: TravelerContact | null;
}

export type ProviderBookingDetails = HomestayBookingDetails;

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
