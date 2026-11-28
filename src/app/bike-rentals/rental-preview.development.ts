import { PAGE_SIZE, PRICE_RANGES, RentalCategory, RentalPage, RentalQuery, RentalVehicle } from './rental-models';

export const rentalPreviewEnabled = false;

interface PreviewVehicle extends RentalVehicle {
  category: RentalCategory;
  rating: number;
  reviewCount: number;
}

const vehicles: readonly PreviewVehicle[] = [
  { id: 1, category: 'scooter', vehicle_type: 'bike', vehicle_name: 'Honda Dio Scooter', city: 'Colombo', price_per_day: 1500, rating: 4.8, reviewCount: 124, primary_image_url: '/assets/rental-preview/blue-scooter.webp' },
  { id: 2, category: 'motorcycle', vehicle_type: 'bike', vehicle_name: 'Yamaha FZ Motorcycle', city: 'Galle', price_per_day: 2000, rating: 4.7, reviewCount: 98, primary_image_url: '/assets/rental-preview/black-motorcycle.webp' },
  { id: 3, category: 'bicycle', vehicle_type: 'bicycle', vehicle_name: 'Trek Mountain Bicycle', city: 'Trincomalee', price_per_day: 800, rating: 4.6, reviewCount: 76, primary_image_url: '/assets/rental-preview/mountain-bicycle.webp' },
  { id: 4, category: 'scooter', vehicle_type: 'bike', vehicle_name: 'TVS Jupiter Scooter', city: 'Kandy', price_per_day: 1800, rating: 4.7, reviewCount: 112, primary_image_url: '/assets/rental-preview/red-scooter.webp' },
  { id: 5, category: 'motorcycle', vehicle_type: 'bike', vehicle_name: 'Bajaj Pulsar Motorcycle', city: 'Jaffna', price_per_day: 1900, rating: 4.6, reviewCount: 89, primary_image_url: '/assets/rental-preview/white-motorcycle.webp' },
  { id: 6, category: 'electric', vehicle_type: 'bicycle', vehicle_name: 'Hero Electric Cycle', city: 'Ella', price_per_day: 700, rating: 4.5, reviewCount: 63, primary_image_url: '/assets/rental-preview/electric-bicycle.webp' },
].map(vehicle => ({
  ...vehicle, currency: 'LKR', created_at: '2026-01-01',
})) as PreviewVehicle[];

export function previewVehicle(id: number): RentalVehicle | undefined {
  return vehicles.find(vehicle => vehicle.id === id);
}

export function previewSearch(query: RentalQuery): RentalPage {
  const [min, max] = PRICE_RANGES[query.price] ?? [0, Infinity];
  const filtered = vehicles.filter(vehicle =>
    (!query.category || vehicle.category === query.category || vehicle.vehicle_type === query.category) &&
    (!query.city || vehicle.city?.toLowerCase().includes(query.city.toLowerCase())) &&
    Number(vehicle.price_per_day) >= min && Number(vehicle.price_per_day) <= (max ?? Infinity) &&
    (!query.rating || vehicle.rating >= 4),
  );
  filtered.sort((left, right) => {
    switch (query.sort) {
      case 'price_asc': return Number(left.price_per_day) - Number(right.price_per_day);
      case 'price_desc': return Number(right.price_per_day) - Number(left.price_per_day);
      case 'rating': return right.rating - left.rating;
      case 'popular': return right.reviewCount - left.reviewCount;
      default: return left.id - right.id;
    }
  });
  const start = (query.page - 1) * PAGE_SIZE;
  return { items: filtered.slice(start, start + PAGE_SIZE), total: filtered.length, pages: Math.ceil(filtered.length / PAGE_SIZE) };
}
