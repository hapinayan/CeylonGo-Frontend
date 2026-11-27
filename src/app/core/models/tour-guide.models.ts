import { ListingResponse } from './provider.models';

export type TourPackagePricingUnit = 'per_person' | 'per_group' | 'per_day';

export interface MvpGuideLanguage {
  language_code: string;
  language_name: string;
  proficiency_level: string;
  is_primary: boolean;
}

export interface MvpGuideServiceArea {
  province: string;
  district: string;
  city: string;
  is_primary: boolean;
}

export interface MvpGuideProfile {
  years_of_experience: number;
  categories: string[];
  languages: MvpGuideLanguage[];
  service_areas: MvpGuideServiceArea[];
  cancellation_policy: string | null;
}

export interface MvpGuidePackage {
  id: number;
  title: string;
  description: string;
  itinerary?: string | null;
  duration_hours: string | number;
  pricing_type: 'per_person' | 'per_group';
  price: string | number;
  currency: 'LKR';
  max_people: number;
  included_services?: string | null;
  excluded_services?: string | null;
  meeting_point: string;
  meeting_latitude?: string | number | null;
  meeting_longitude?: string | number | null;
  is_active: boolean;
}

export interface MvpGuideDetails {
  listing: ListingResponse;
  provider_name: string;
  profile: MvpGuideProfile | null;
  packages: MvpGuidePackage[];
}

export interface MvpGuidePage {
  items: MvpGuideDetails[];
  next_offset: number | null;
}

export interface MvpGuideSlot {
  id: number;
  package_id: number;
  starts_at: string;
  ends_at: string;
  available: boolean;
  capacity: number;
  total_amount: string | number;
  currency: 'LKR';
}

export interface MvpGuideCategoryInfo {
  slug: string;
  name: string;
  examples: string;
}

export interface MvpGuideBookingCreateRequest {
  listing_id: number;
  slot_id: number;
  starts_at: string;
  ends_at: string;
  quantity: number;
  expected_total: string;
  request_key: string;
}

export interface MvpGuideBookingResponse {
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
  booking_reference?: string | null;
  slot_id?: number | null;
  package_id?: number | null;
}

export interface TourPackage {
  id: string;
  name: string;
  tourType: string;
  shortDescription: string;
  imageUrl: string;
  durationLabel: string;
  durationHours?: number;
  durationDays?: number;
  minGroupSize?: number;
  maxGroupSize: number;
  destinations: string[];
  price: number;
  pricingUnit: TourPackagePricingUnit;
  currency: string;
  meetingPoint?: string;
  availableTimes: string[];
  highlights: string[];
  included: string[];
  excluded: string[];
}

export interface TourGuideReview {
  id: string;
  authorName: string;
  rating: number;
  date: string;
  comment: string;
}

export interface TourGuide {
  id: string;
  name: string;
  providerName?: string;
  avatarUrl: string;
  coverImageUrl: string;
  galleryImages?: string[];
  verified: boolean;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  languages: string[];
  pricePerDay: number;
  pricingUnit?: TourPackagePricingUnit;
  currency: string;
  location: string;
  categoryIds: string[];
  headline?: string;
  about?: string;
  localKnowledge?: string;
  qualifications?: string[];
  licenseStatus?: string;
  specialties?: string[];
  serviceAreas?: string[];
  meetingPoint?: string;
  meetingCoords?: { lat: number; lng: number } | null;
  safetyRequirements?: string;
  cancellationPolicy?: string;
  packages?: TourPackage[];
  reviews?: TourGuideReview[];
  isFavorite?: boolean;
  featuredRank?: number;
  phone?: string;
  email?: string;
  isPreviewSample?: boolean;
}

export interface TourCategory {
  id: string;
  name: string;
  slug: string;
  backendSlug?: string;
  icon: string;
  description?: string;
  count?: number;
}

export type TourGuideSortBy = 'top_rated' | 'price_asc' | 'price_desc' | 'experience';

export interface TourGuideFilter {
  query: string;
  location: string;
  date: string | null;
  travelers: number;
  language: string;
  specialization: string;
  categoryId: string;
  sortBy: TourGuideSortBy;
  languages: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minExperience: number | null;
  minRating: number | null;
  verifiedOnly: boolean;
}

export interface TourGuidePagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TravelerNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'booking' | 'system' | 'message';
}

export type TourGuidePaymentMethod = 'simulated' | 'at_location';
export type TourGuidePaymentStatus = 'unpaid' | 'paid_demo' | 'failed';
export type TourGuideBookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface TourGuideBookingDraft {
  guideId: string;
  packageId: string;
  slotId?: number;
  startsAtIso?: string;
  endsAtIso?: string;
  expectedTotal?: string;
  date: string;
  time: string;
  travelers: number;
  days: number;
  notes?: string;
  requestKey: string;
}

export interface TourGuideBookingRecord {
  id: string;
  bookingReference: string;
  requestKey: string;
  guideId: string;
  guideName: string;
  guideAvatarUrl: string;
  packageId: string;
  packageName: string;
  durationLabel: string;
  meetingPoint: string;
  location: string;
  date: string;
  time: string;
  travelers: number;
  totalAmount: number;
  currency: string;
  pricingUnit: TourPackagePricingUnit;
  paymentMethod: TourGuidePaymentMethod;
  paymentStatus: TourGuidePaymentStatus;
  bookingStatus: TourGuideBookingStatus;
  travelerName: string;
  travelerEmail: string;
  travelerPhone?: string;
  createdAt: string;
}
