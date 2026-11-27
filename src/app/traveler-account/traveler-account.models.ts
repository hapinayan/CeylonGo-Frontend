export type TravelerInterest =
  | 'culture'
  | 'adventure'
  | 'wildlife'
  | 'nature'
  | 'eco_tourism'
  | 'local_food'
  | 'heritage'
  | 'beaches'
  | 'village_experiences'
  | 'artisan_handicrafts'
  | 'cycling'
  | 'mountains_hiking'
  | 'photography'
  | 'relaxation';

export type AccommodationPreference = 'homestay' | 'guesthouse' | 'hotel' | 'hostel' | 'other';

export type TransportPreference =
  | 'walking'
  | 'bicycle'
  | 'motorbike'
  | 'scooter'
  | 'public_transport'
  | 'other';

export type TravelStyle =
  | 'budget'
  | 'adventure'
  | 'cultural'
  | 'family'
  | 'relaxation'
  | 'local_experiences';

export interface TravelerPreferences {
  preferred_destinations: string[];
  interests: TravelerInterest[];
  accommodation_preferences: AccommodationPreference[];
  transport_preferences: TransportPreference[];
  budget_min: number | null;
  budget_max: number | null;
  travel_style: TravelStyle | null;
}

export interface NotificationSettings {
  booking_updates: boolean;
  payment_updates: boolean;
  community_activity: boolean;
  promotional_updates: boolean;
}

export const INTEREST_OPTIONS: ReadonlyArray<{ value: TravelerInterest; label: string }> = [
  { value: 'culture', label: 'Culture' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'nature', label: 'Nature' },
  { value: 'eco_tourism', label: 'Eco Tourism' },
  { value: 'local_food', label: 'Local Food' },
  { value: 'heritage', label: 'Heritage' },
  { value: 'beaches', label: 'Beaches' },
  { value: 'village_experiences', label: 'Village Experiences' },
  { value: 'artisan_handicrafts', label: 'Artisan Handicrafts' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'mountains_hiking', label: 'Mountains & Hiking' },
  { value: 'photography', label: 'Photography' },
  { value: 'relaxation', label: 'Relaxation' },
];

export const ACCOMMODATION_OPTIONS: ReadonlyArray<{ value: AccommodationPreference; label: string }> = [
  { value: 'homestay', label: 'Homestay' },
  { value: 'guesthouse', label: 'Guesthouse' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'other', label: 'Other' },
];

export const TRANSPORT_OPTIONS: ReadonlyArray<{ value: TransportPreference; label: string }> = [
  { value: 'walking', label: 'Walking' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'public_transport', label: 'Public Transport' },
  { value: 'other', label: 'Other' },
];

export const TRAVEL_STYLE_OPTIONS: ReadonlyArray<{ value: TravelStyle; label: string }> = [
  { value: 'budget', label: 'Budget' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'family', label: 'Family' },
  { value: 'relaxation', label: 'Relaxation' },
  { value: 'local_experiences', label: 'Local Experiences' },
];
