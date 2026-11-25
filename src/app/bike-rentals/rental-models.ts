export type RentalType = 'bike' | 'bicycle';
export type RentalCategory = '' | RentalType | 'scooter' | 'motorcycle' | 'electric';
export type RentalSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

export interface RentalQuery {
  city: string;
  pickup: string;
  dropoff: string;
  category: RentalCategory;
  price: string;
  rating: boolean;
  sort: RentalSort;
  page: number;
}

export const DEFAULT_QUERY: RentalQuery = {
  city: '', pickup: '', dropoff: '', category: '', price: '', rating: false, sort: 'newest', page: 1,
};

export const PAGE_SIZE = 6;
export const PRICE_RANGES: Record<string, readonly [number, number?]> = {
  budget: [500, 1500], mid: [1501, 3000], premium: [3001],
};

export interface RentalVehicle {
  id: number;
  vehicle_type: RentalType | 'tuk_tuk';
  vehicle_name: string;
  city?: string | null;
  district?: string | null;
  description?: string | null;
  price_per_day: string | number;
  currency: string;
  is_provider_verified?: boolean;
  is_sponsored?: boolean;
  created_at: string;
  primary_image_url?: string | null;
  transmission?: string;
  fuel_type?: string;
  helmets?: { helmet_provided: boolean; requires_helmet: boolean } | null;
  provider_business_name?: string | null;
  cancellation_policy?: string | null;
  model_year?: number | null;
  seating_capacity?: number;
  fuel_policy?: string;
  security_deposit?: string | number;
  security_deposit_terms?: string;
  category?: RentalCategory;
  location?: { location_name: string } | null;
  images?: { id: number; image_url: string; caption?: string | null }[];
  rating?: number;
  reviewCount?: number;
}

export interface RentalPage {
  items: RentalVehicle[];
  total: number;
  pages: number;
}

export interface RentalReviews {
  total: number;
  average_rating: number;
  items: { id: number; reviewer_name: string | null; rating: string; title: string | null; comment: string | null }[];
}

export function isBike(vehicle: RentalVehicle): boolean {
  return vehicle.vehicle_type === 'bike' || vehicle.vehicle_type === 'bicycle';
}

export function rentalDateError(pickup: string, dropoff: string): string {
  if (!pickup && !dropoff) return '';
  if (!pickup || !dropoff) return 'Choose both pickup and return dates.';
  if (![pickup, dropoff].every(date => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date)) {
    return 'Enter valid pickup and return dates.';
  }
  return dropoff <= pickup ? 'Return date must be after pickup date.' : '';
}
