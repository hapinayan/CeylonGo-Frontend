import { BookingService, TravelerBooking, bookingGroup } from './booking-model';

export const bookingPreviewEnabled = true;
const year = new Date().getFullYear();
const date = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const examples: [BookingService, string, string, string, number, string, number, number][] = [
  ['homestay', 'Hill Country Homestay', 'Ella', '/images/traveler-home/find-homestays.webp', 18500, 'confirmed', 7, 10],
  ['activity', 'Kelani River Rafting', 'Kitulgala', '/images/experiences/kitulgala-rafting.webp', 12000, 'confirmed', 14, 14],
  ['eco', 'Bentota Mangrove Safari', 'Bentota', '/images/experiences/bentota-mangroves.webp', 8500, 'completed', -7, -7],
  ['guide', 'Kandy Heritage Walk', 'Kandy', '/images/experiences/kandyan-performance.webp', 9000, 'pending', 21, 21],
  ['rental', 'Coastal Scooter Rental', 'Colombo', '/assets/rental-preview/blue-scooter.webp', 3000, 'cancelled', 3, 5],
  ['artisan', 'Sri Lankan Artisan Showcase', 'Colombo', '/images/artisan/ruhunu_pottery.jpg', 7500, 'completed', -14, -14],
];

export const bookingExamples: TravelerBooking[] = examples.map(([service, title, location, image, amount, status, start, end], index) => ({
  service, id: 1, reference: 'SAMPLE-' + year + '-' + (index + 1), title, location, image, amount, status, start: date(start), end: date(end), currency: 'LKR',
  paymentStatus: index === 2 || index === 5 ? 'paid' : 'unpaid',
  datesLabel: ({ homestay: 'Check-in and check-out', activity: 'Activity date', eco: 'Experience schedule',
    guide: 'Guide schedule', rental: 'Pickup and return', artisan: 'Pickup date' })[service],
  quantityLabel: ({ homestay: 'Guests', activity: 'Participants', eco: 'Participants', guide: 'Party size',
    rental: 'Vehicles', artisan: 'Reserved items' })[service],
  quantity: service === 'rental' ? '1 vehicle' : service === 'artisan' ? '1 item' : '2 travelers',
}));

export function canSimulateCancellation(row: TravelerBooking): boolean {
  return row.paymentStatus === 'unpaid' && bookingGroup(row) === 'upcoming' &&
    (row.status === 'pending' || row.status === 'confirmed');
}
