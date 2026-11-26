export const serviceLabels = {
  homestay: 'Homestay',
  activity: 'Adventure',
  eco: 'Adventure',
  guide: 'Tour Guide',
  rental: 'Bike & Bicycle Rental',
} as const;

export type BookingService = keyof typeof serviceLabels;
/** Bookable service groups only — Artisan local businesses are non-bookable. */
export const bookingServices: BookingService[] = ['homestay', 'activity', 'guide', 'rental'];
export const isBookingService = (value: string): value is BookingService => Object.hasOwn(serviceLabels, value);

export type BookingCategoryFilter = 'all' | 'homestay' | 'activity' | 'guide' | 'bike' | 'bicycle';

export interface TravelerBooking {
  service: BookingService;
  rawCategory?: 'homestay' | 'adventure' | 'guide' | 'bike' | 'bicycle';
  id: number;
  listingId?: number;
  reference?: string | null;
  title: string;
  location?: string | null;
  image?: string | null;
  createdAt?: string | null;
  start?: string | null;
  end?: string | null;
  quantity?: string;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  amount: string | number;
  currency: string;
  datesLabel?: string;
  quantityLabel?: string;
  facts?: { label: string; value: string | number }[];
  cancellation?: { policy?: string | null; cutoffHours?: number; reason?: string | null; at?: string | null };
  refundEstimate?: { amount: string | number; currency: string; note: string };
  contactId?: number;
}

export interface BookingRefund {
  id: number;
  amount: string | number;
  currency: string;
  refund_status: string;
}

export interface BookingContact {
  name: string;
  phone: string;
}

export function uniqueBookings(rows: TravelerBooking[]): TravelerBooking[] {
  const unique = new Map<string, TravelerBooking>();
  for (const row of rows) {
    const key = bookingKey(row);
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()];
}

export type BookingFilter = 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled';
export const bookingKey = (row: TravelerBooking) => row.service + '/' + row.id;
export const statusLabel = (status: string) => status.replaceAll('_', ' ');

export const bookingTime = (value: string | null | undefined) =>
  !value
    ? NaN
    : Date.parse(
        value.length === 10
          ? value + 'T00:00:00+05:30'
          : /(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
            ? value
            : value + 'Z',
      );

export function bookingGroup(row: TravelerBooking, now = Date.now()): BookingFilter {
  const status = (row.status || '').toLowerCase();
  if (status === 'completed') return 'completed';
  if (status === 'cancelled' || status === 'rejected') return 'cancelled';
  if (['pending', 'pending_payment', 'confirmed', 'approved', 'ready_for_pickup'].includes(status) && bookingTime(row.start) > now) {
    return 'upcoming';
  }
  if (status === 'pending' || status === 'pending_payment') return 'pending';
  return 'all';
}

export function matchesBookingFilter(row: TravelerBooking, filter: BookingFilter, now = Date.now()): boolean {
  const status = (row.status || '').toLowerCase();
  switch (filter) {
    case 'all':
      return true;
    case 'upcoming':
      return ['pending', 'pending_payment', 'confirmed', 'approved', 'ready_for_pickup'].includes(status) && bookingTime(row.start) > now;
    case 'pending':
      return status === 'pending' || status === 'pending_payment';
    case 'completed':
      return status === 'completed';
    case 'cancelled':
      return status === 'cancelled' || status === 'rejected';
  }
}

export function matchesBookingCategory(row: TravelerBooking, category: string): boolean {
  if (!category || category === 'all') return true;
  if (category === 'bike' || category === 'bicycle') {
    return row.rawCategory === category;
  }
  if (category === 'activity') {
    return row.service === 'activity' || row.service === 'eco' || row.rawCategory === 'adventure';
  }
  return row.service === category;
}

export function matchesBooking(row: TravelerBooking, query: string): boolean {
  const clean = query.toLowerCase().trim();
  if (!clean) return true;
  const haystack = [row.id, row.reference, serviceLabels[row.service], row.title, row.location].join(' ').toLowerCase();
  return clean.split(/\s+/).every((word) => haystack.includes(word));
}

export function canCancelBookingStatus(status: string): boolean {
  const s = (status || '').toLowerCase();
  return ['pending', 'pending_payment', 'confirmed', 'approved', 'ready_for_pickup'].includes(s);
}
