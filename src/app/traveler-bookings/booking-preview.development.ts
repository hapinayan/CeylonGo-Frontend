import { BookingService, TravelerBooking, bookingGroup } from './booking-model';

export const bookingPreviewEnabled = false;
const year = new Date().getFullYear();
const date = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const examples: [BookingService, string, string, string, number, string, number, number][] = [
  ['homestay', 'Hill Country Homestay', 'Ella', '/images/traveler-home/find-homestays.webp', 18500, 'confirmed', 7, 10],
  ['activity', 'Trincomalee Reef Snorkeling', 'Trincomalee', '/images/experiences/trincomalee-snorkeling.webp', 12000, 'confirmed', 14, 14],
  ['activity', 'Yala Wildlife Safari', 'Yala', '/images/experiences/wildlife-safari.webp', 8500, 'completed', -7, -7],
  ['guide', 'Kandy Cultural Heritage Walk', 'Kandy', '/images/experiences/cultural-village.webp', 9000, 'pending', 21, 21],
  ['rental', 'Ella Bicycle Rental', 'Ella', '/images/traveler-home/rent-bicycle.webp', 3000, 'cancelled', 3, 5],
];

export const bookingExamples: TravelerBooking[] = examples.map(([service, title, location, image, amount, status, start, end], index) => ({
  service, id: 1, reference: 'SAMPLE-' + year + '-' + (index + 1), title, location, image, amount, status, start: date(start), end: date(end), currency: 'LKR',
  paymentStatus: index === 2 ? 'paid' : 'unpaid',
  datesLabel: ({ homestay: 'Check-in and check-out', activity: 'Activity date', eco: 'Experience schedule',
    guide: 'Guide schedule', rental: 'Pickup and return' })[service],
  quantityLabel: ({ homestay: 'Guests', activity: 'Participants', eco: 'Participants', guide: 'Party size',
    rental: 'Vehicles' })[service],
  quantity: service === 'rental' ? '1 vehicle' : '2 travelers',
}));

export function canSimulateCancellation(row: TravelerBooking): boolean {
  return row.paymentStatus === 'unpaid' && bookingGroup(row) === 'upcoming' &&
    (row.status === 'pending' || row.status === 'confirmed');
}
