export const serviceLabels = {
  homestay: 'Homestay', activity: 'Adventure', eco: 'Eco-Tourism',
  guide: 'Tour Guide', rental: 'Bike Rental', artisan: 'Artisan',
} as const;

export type BookingService = keyof typeof serviceLabels;
export const bookingServices: BookingService[] = ['homestay', 'activity', 'guide', 'rental', 'artisan'];
export const isBookingService = (value: string): value is BookingService => Object.hasOwn(serviceLabels, value);

export interface TravelerBooking {
  service: BookingService;
  id: number;
  reference?: string | null;
  title: string;
  location?: string | null;
  image?: string | null;
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

export interface BookingRefund { id: number; amount: string | number; currency: string; refund_status: string }
export interface BookingContact { name: string; phone: string }

export function uniqueBookings(rows: TravelerBooking[]): TravelerBooking[] {
  const unique = new Map<string, TravelerBooking>();
  for (const row of rows) {
    const key = bookingKey(row);
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()];
}

export type BookingFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';
export const bookingKey = (row: TravelerBooking) => row.service + '/' + row.id;
export const statusLabel = (status: string) => status.replaceAll('_', ' ');
export const bookingTime = (value: string | null | undefined) => !value ? NaN
  : Date.parse(value.length === 10 ? value + 'T00:00:00+05:30'
    : /(?:z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + 'Z');

export function bookingGroup(row: TravelerBooking, now = Date.now()): BookingFilter {
  if (row.status === 'completed') return 'completed';
  if (row.status === 'cancelled') return 'cancelled';
  if (['pending', 'pending_payment', 'confirmed', 'approved', 'ready_for_pickup'].includes(row.status) && bookingTime(row.start) > now) return 'upcoming';
  return 'all';
}

export function matchesBooking(row: TravelerBooking, query: string): boolean {
  const haystack = [row.id, row.reference, serviceLabels[row.service], row.title, row.location].join(' ').toLowerCase();
  return query.toLowerCase().trim().split(/\s+/).every(word => haystack.includes(word));
}
