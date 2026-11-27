export type RentalType = 'bike' | 'bicycle';
export type RentalCategory = '' | RentalType | 'scooter' | 'motorcycle' | 'electric';
export type RentalSort = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

export interface RentalQuery {
  city: string;
  pickup: string;
  dropoff: string;
  category: RentalCategory;
  price: string;
  transmission?: string;
  availableOnly?: boolean;
  rating: boolean;
  sort: RentalSort;
  page: number;
}

export const DEFAULT_QUERY: RentalQuery = {
  city: '', pickup: '', dropoff: '', category: '', price: '', transmission: '', availableOnly: false, rating: false, sort: 'newest', page: 1,
};

export const PAGE_SIZE = 8;
export const PRICE_RANGES: Record<string, readonly [number, number?]> = {
  budget: [500, 1500], mid: [1501, 3000], premium: [3001],
};

export interface RentalVehicleMetadata {
  subtype?: string;
  transmission?: string | null;
  model_year?: number | null;
  seating_capacity?: number | null;
  fuel_type?: string | null;
  specifications?: string | null;
  pickup_name?: string | null;
  pickup_address?: string | null;
  requirements?: string | null;
  rental_terms?: string | null;
  cancellation_policy?: string | null;
}

export interface RentalLocationInfo {
  location_name?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

export interface RentalVehicle {
  id: number;
  vehicle_type: RentalType | 'tuk_tuk';
  vehicle_subtype?: string | null;
  vehicle_name: string;
  brand?: string | null;
  model?: string | null;
  city?: string | null;
  district?: string | null;
  location_name?: string | null;
  pickup_address?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  description?: string | null;
  price_per_day: string | number;
  currency: string;
  is_provider_verified?: boolean;
  is_sponsored?: boolean;
  is_available?: boolean;
  approval_status?: string;
  requires_driving_license?: boolean;
  created_at: string;
  primary_image_url?: string | null;
  transmission?: string;
  engine_cc?: number | null;
  fuel_type?: string | null;
  helmets?: { helmet_provided: boolean; requires_helmet: boolean; storage_included?: boolean; lock_included?: boolean } | null;
  provider_business_name?: string | null;
  provider_avatar_url?: string | null;
  provider_phone?: string | null;
  provider_email?: string | null;
  cancellation_policy?: string | null;
  late_return_policy?: string | null;
  mileage_limit?: string | null;
  minimum_age?: number | null;
  model_year?: number | null;
  seating_capacity?: number | null;
  fuel_policy?: string;
  security_deposit?: string | number | null;
  security_deposit_terms?: string;
  restrictions?: string | null;
  bicycle_type?: string | null;
  category?: RentalCategory;
  rental?: RentalVehicleMetadata | null;
  location?: RentalLocationInfo | null;
  images?: { id: number; image_url: string; caption?: string | null; is_primary?: boolean }[];
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

export const RENTAL_CITIES: readonly string[] = [
  'Colombo',
  'Kandy',
  'Galle',
  'Ella',
  'Negombo',
  'Mirissa',
  'Sigiriya',
  'Jaffna',
  'Trincomalee',
  'Nuwara Eliya',
  'Anuradhapura',
  'Polonnaruwa',
];

export function formatLkr(amount: string | number | null | undefined): string {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num)) return 'LKR 0.00';
  return (
    'LKR ' +
    num.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
