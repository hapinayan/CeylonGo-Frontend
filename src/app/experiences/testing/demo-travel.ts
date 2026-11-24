import { HttpErrorResponse } from '@angular/common/http';
import { map, mergeMap, of, throwError, timer } from 'rxjs';
import { EcoDetail } from '../models/eco';
import { BookingSlot, Reservation } from '../models/travel';
import { TravelSource } from '../services/travel-api';
import { demoExperiences } from './demo-experiences';

const descriptions: Readonly<Record<string, string>> = {
  safari: 'Explore the scrubland by safari jeep and look for elephants with a guide.',
  tea: 'Walk through highland tea rows and learn how tea leaves are picked and processed.',
  village: 'Learn about Sri Lankan village traditions and watch a Kandyan dance performance.',
  snorkel: 'Explore shallow coral habitat and look for reef life on a guided swim.',
  rafting: 'Practice the guide’s paddle signals and navigate a forest-lined stretch of the Kelani River.',
  hike: 'Follow hillside trails above Ella to viewpoints overlooking the surrounding ridges.',
  cooking: 'Prepare Sri Lankan dishes in an open-air kitchen and learn how spices are combined.',
  mangrove: 'Explore waterways by boat and learn about the mangrove habitat.',
  sigiriya: 'Walk through the gardens and learn about the history of the rock fortress.',
  birdwalk: 'Walk along wetland paths and look for waterbirds among the reeds.',
};

const listings = new Map(demoExperiences.map((item, index): [string, EcoDetail] => [item.id, {
  id: index + 1, title: item.title, eco_category: item.category, city: item.location, district: item.location,
  description: descriptions[item.id], duration_hours: 2, base_price: item.price, currency: 'LKR', pricing_type: 'per_person',
  min_participants: 1, max_group_size: 5, min_age: 10, meeting_point: item.location,
  has_verified_eco_badge: false, environmental_guidelines: '', wildlife_safety_summary: '',
  safety_rules: [{id: 1, title: 'Preview safety rule', description: 'Follow the guide’s instructions.', is_mandatory: true}],
}]));
export const previewListing = (id: string): EcoDetail | null => listings.get(id) ?? null;
const slots = new Map<number, BookingSlot>();
const reservations = new Map<number, Reservation>();
let sequence = 0;
const failure = (status: number) => throwError(() => new HttpErrorResponse({status}));

export const demoTravel: TravelSource = {
  saved: () => of({items: [], total: 0, page: 1, page_size: 8, total_pages: 0}),
  save: () => failure(404),
  unsave: () => failure(404),
  slots: (id, day, page) => timer(220).pipe(map(() => {
    if (page > 1) return [];
    return ['09:00', '14:00'].map((time, index) => {
      const start = new Date(day + 'T' + time + ':00+05:30');
      const slot: BookingSlot = {
        id: Math.floor(start.getTime() / 86400000) * 100 + id * 3 + index,
        experience_id: id, starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + 7200000).toISOString(), capacity: 5, available_places: 5, is_open: true,
      };
      const held = [...reservations.values()].filter(row => row.slot_id === slot.id && row.status !== 'cancelled');
      slot.available_places -= held.reduce((sum, row) => sum + row.participants, 0);
      slots.set(slot.id, slot);
      return slot;
    }).filter(slot => Date.parse(slot.starts_at) > Date.now() && slot.available_places > 0);
  })),
  reserve: request => timer(220).pipe(mergeMap(() => {
    const slot = slots.get(request.slot_id);
    const listing = slot && [...listings.values()].find(item => item.id === slot.experience_id);
    if (!slot || !listing) return failure(404);
    if ([...reservations.values()].some(row => row.slot_id === slot.id && row.status !== 'cancelled')) return failure(409);
    const id = ++sequence;
    const row: Reservation = {
      id, module: 'eco_experience', reference: 'PREVIEW-ECO-' + String(id).padStart(4, '0'),
      experience_id: slot.experience_id, slot_id: slot.id, participants: request.participants,
      status: 'pending', payment_status: 'unpaid', payment_method: 'pay_at_location',
      total: Number(listing.base_price) * request.participants, currency: listing.currency,
      starts_at: slot.starts_at, ends_at: slot.ends_at,
    };
    reservations.set(id, row);
    return of(row);
  })),
  bookings: (page, size) => timer(120).pipe(map(() => [...reservations.values()].reverse().slice((page - 1) * size, page * size))),
  booking: id => timer(120).pipe(mergeMap(() => {
    const row = reservations.get(id);
    return row ? of(row) : failure(404);
  })),
  cancel: id => timer(220).pipe(mergeMap(() => {
    const row = reservations.get(id);
    if (!row) return failure(404);
    if (row.status === 'cancelled') return failure(409);
    const cancelled = {...row, status: 'cancelled'};
    reservations.set(id, cancelled);
    return of(cancelled);
  })),
  payment: id => timer(120).pipe(mergeMap(() => {
    const row = reservations.get(id);
    return row ? of({
      booking_id: id, booking_status: row.status, payment_method: row.payment_method,
      payment_status: row.payment_status, total_price: row.total, currency: row.currency,
    }) : failure(404);
  })),
};
