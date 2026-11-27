export type AiServiceCategory = 'homestay' | 'adventure' | 'guide' | 'bike' | 'bicycle' | 'artisan';

export interface AiConversationThread {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiServiceOption {
  id: number;
  title: string;
  capacity: number;
  advertised_price_lkr?: string | null;
  pricing_type?: string | null;
}

export interface AiServiceDetails {
  amenities?: string[];
  options?: AiServiceOption[];
  duration_minutes?: number | null;
  craft_category?: string | null;
}

export interface AiListingResult {
  ref: string;
  listing_id: number;
  category: AiServiceCategory;
  title: string;
  district: string;
  locality: string;
  advertised_price_lkr: string | null;
  latitude?: number | null;
  longitude?: number | null;
  details?: AiServiceDetails | null;
}

export interface AiQuote {
  listing_id: number;
  category: AiServiceCategory;
  title: string;
  starts_at: string;
  ends_at: string;
  quantity: number;
  total_lkr: string;
  room_id?: number | null;
  slot_id?: number | null;
  package_id?: number | null;
  motorcycle_license_required?: boolean;
}

export interface AiQuotedResult {
  ref: string;
  quote: AiQuote;
}

export interface AiPlanDay {
  day: number;
  destination: string;
  morning: string;
  afternoon: string;
  evening: string;
  transport: string;
  service_refs?: string[];
  estimated_food_lkr: string;
  estimated_transport_lkr: string;
  estimated_other_lkr: string;
}

export interface AiPlan {
  title: string;
  summary: string;
  start_date?: string | null;
  travelers: number;
  budget_lkr: string;
  interests?: string[];
  accommodation_preference?: string | null;
  transport_preference?: string | null;
  travel_style?: string | null;
  days: AiPlanDay[];
  alternatives?: string[];
}

import { DailyForecast } from '../../../core/models/weather-map.models';

export interface AiItineraryWeather {
  day: number;
  destination: string;
  source: string;
  fetched_at: string;
  stale: boolean;
  forecast: DailyForecast;
}

export interface AiItinerary {
  plan: AiPlan;
  listings: AiListingResult[];
  quotes: AiQuotedResult[];
  quoted_services_lkr: string;
  estimated_other_lkr: string;
  estimated_total_lkr: string;
  remaining_budget_lkr: string;
  weather?: AiItineraryWeather[] | null;
}

export interface AiBookingProposal {
  quote: AiQuote;
  confirmation_token: string;
  expires_at: string;
}

export interface AiBookingStatus {
  booking_id: number;
  status: string;
  total_lkr: string;
  payment_status: string | null;
  payment_method: string | null;
}

export interface AiTurn {
  id: number;
  user_message: string;
  assistant_message: string;
  itinerary?: AiItinerary | null;
  proposal?: AiBookingProposal | null;
  listings: AiListingResult[];
  quotes: AiQuotedResult[];
  bookings: AiBookingStatus[];
  created_at: string;
}

export interface AiBookingSelectionRequest {
  listing_id: number;
  quantity: number;
  starts_at?: string | null;
  ends_at?: string | null;
  day?: string | null;
  room_id?: number | null;
  slot_id?: number | null;
  package_id?: number | null;
}

export interface AiBookingConfirmRequest {
  confirmation_token: string;
  confirm: true;
  motorcycle_license_confirmed?: boolean;
  license_valid_until?: string | null;
}

export interface AiPaymentResponse {
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

export interface AiBookingDetailResponse {
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
  booking_reference: string | null;
  slot_id: number | null;
  package_id: number | null;
  rental_unit_ids: number[] | null;
  payments: AiPaymentResponse[];
}

export interface AiSavedTrip {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  itinerary: AiItinerary;
}

export interface AiQuickPreferenceDraft {
  destination: string;
  duration?: string;
  startDate?: string;
  travelers?: number;
  budgetLkr?: number | null;
  interests?: string;
}

export interface AiFormattedError {
  status: number;
  message: string;
  retryAfterSeconds: number | null;
  code:
    | 'auth'
    | 'forbidden'
    | 'not_found'
    | 'expired_or_conflict'
    | 'validation'
    | 'rate_limit'
    | 'quota'
    | 'unavailable'
    | 'timeout'
    | 'unknown';
}

export interface AiMarkdownBlock {
  type: 'heading' | 'paragraph' | 'list' | 'table';
  text?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export function buildNaturalLanguageTripPrompt(draft: AiQuickPreferenceDraft): string {
  const dest = draft.destination.trim() || 'Sri Lanka';
  const durationPart = draft.duration?.trim() ? `a ${draft.duration.trim()}` : 'a';
  const travelersPart =
    draft.travelers && draft.travelers > 1
      ? ` for ${draft.travelers} travelers`
      : draft.travelers === 1
        ? ' for 1 traveler'
        : '';
  const datePart = draft.startDate?.trim() ? ` starting ${draft.startDate.trim()}` : '';
  const budgetPart =
    draft.budgetLkr && draft.budgetLkr > 0
      ? ` with a budget of LKR ${Math.round(draft.budgetLkr).toLocaleString('en-US')}`
      : '';
  const interestPart = draft.interests?.trim()
    ? ` focusing on ${draft.interests.trim()}`
    : '';
  return `Plan ${durationPart} trip to ${dest}${travelersPart}${datePart}${budgetPart}${interestPart}.`;
}

/**
 * Parses safe structured blocks from plain text / Markdown without executing raw HTML or scripts.
 */
export function parseSafeAiTextBlocks(raw: string): AiMarkdownBlock[] {
  const safe = (raw || '').replace(/\r\n/g, '\n').trim();
  if (!safe) return [];

  const lines = safe.split('\n');
  const blocks: AiMarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    if (/^#{1,4}\s+/.test(line)) {
      blocks.push({ type: 'heading', text: line.replace(/^#{1,4}\s+/, '').trim() });
      i += 1;
      continue;
    }

    // Markdown table
    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s:-]+\|/.test(lines[i + 1].trim())) {
      const parseCells = (row: string) =>
        row
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const headers = parseCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        rows.push(parseCells(lines[i].trim()));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Bullet / numbered lists
    if (/^(?:[-*•]|\d+\.)\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(?:[-*•]|\d+\.)\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^(?:[-*•]|\d+\.)\s+/, '').trim());
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph (preserve adjacent plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !/^(?:[-*•]|\d+\.)\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
  }

  return blocks;
}

export function getServiceCategoryLabel(category: AiServiceCategory): string {
  switch (category) {
    case 'homestay':
      return 'Homestay';
    case 'adventure':
      return 'Adventure & Experience';
    case 'guide':
      return 'Tour Guide';
    case 'bike':
      return 'Motorbike / Scooter Rental';
    case 'bicycle':
      return 'Bicycle Rental';
    case 'artisan':
      return 'Artisan & Local Business';
    default:
      return 'CeylonGo Service';
  }
}

export function getServiceDetailRoute(listing: AiListingResult): string[] {
  switch (listing.category) {
    case 'homestay':
      return ['/homestays', String(listing.listing_id)];
    case 'adventure':
      return ['/experiences', String(listing.listing_id)];
    case 'guide':
      return ['/tour-guides', String(listing.listing_id)];
    case 'bike':
    case 'bicycle':
      return ['/bicycles', String(listing.listing_id)];
    case 'artisan':
      return ['/artisans', String(listing.listing_id)];
  }
}

export function getServicePriceUnit(category: AiServiceCategory): string {
  switch (category) {
    case 'homestay':
      return 'per night';
    case 'bike':
    case 'bicycle':
      return 'per day';
    case 'adventure':
      return 'per person';
    case 'guide':
      return 'starting rate';
    default:
      return '';
  }
}

export function formatBookingStatusMessage(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  if (s === 'pending') {
    return 'Booking request submitted. Awaiting service provider confirmation.';
  }
  if (s === 'confirmed') {
    return 'Booking Confirmed by Service Provider';
  }
  if (s === 'cancelled') {
    return 'Cancelled';
  }
  if (s === 'rejected') {
    return 'Declined by Service Provider';
  }
  if (s === 'completed') {
    return 'Completed';
  }
  return status || 'Submitted';
}
