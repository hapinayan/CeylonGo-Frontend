export type Decimal = string | number;

export interface EcoQuery {
  search: string;
  category: string;
  badgeOnly: boolean;
  page: number;
  district?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  minDuration?: number | null;
  maxDuration?: number | null;
}

export interface EcoSummary {
  id: number;
  title: string;
  eco_category: string;
  city: string;
  district: string;
  duration_hours: Decimal;
  base_price: Decimal;
  currency: string;
  pricing_type: string;
  max_group_size: number;
  has_verified_eco_badge: boolean;
}

export interface EcoPage {
  items: EcoSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EcoDetail extends EcoSummary {
  description?: string | null;
  itinerary?: string | null;
  meeting_point: string;
  sponsored_tracking_token?: string | null;
  latitude?: Decimal | null;
  longitude?: Decimal | null;
  provider_business_name?: string | null;
  min_participants: number;
  min_age?: number | null;
  environmental_guidelines: string;
  wildlife_safety_summary: string;
  conservation_factual_contribution?: string | null;
  conservation_marketing_statement?: string | null;
  protected_area_permit_required?: boolean;
  certified_guide_required?: boolean;
  permit_details?: string | null;
  images?: { id: number; image_url: string; caption?: string | null; is_primary: boolean; sort_order: number }[];
  safety_rules?: { id: number; title: string; description: string; is_mandatory: boolean }[];
  practices?: { id: number; claim_description: string; is_verified: boolean }[];
}

export interface EcoReviews {
  total: number;
  average_rating: number;
  items: { id: number; reviewer_name: string; rating: Decimal; title?: string | null; comment?: string | null }[];
}

export interface EcoSlot {
  id: number;
  starts_at: string;
  ends_at: string;
  available_places: number;
}
