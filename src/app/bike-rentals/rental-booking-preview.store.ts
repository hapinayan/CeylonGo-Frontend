import { Injectable, signal } from '@angular/core';
import { RentalDates } from './rental-dates';
import { RentalVehicle } from './rental-models';

export const SAMPLE_TRAVELER = 'Sample Traveler';

export interface PreviewRental {
  reference: string;
  owner: number;
  vehicle: RentalVehicle;
  dates: RentalDates;
  days: number;
  estimate: number;
  status: 'pending' | 'cancelled';
  paymentStatus: 'unpaid';
  cancelledAt?: string;
}

export function previewEstimate(rate: string | number, days: number): number {
  return Math.round(Number(rate) * 100) * days / 100;
}

export function canCancelPreview(rental: PreviewRental, now = Date.now()): boolean {
  return rental.status === 'pending' && Date.parse(rental.dates.pickup_at) > now;
}

@Injectable({ providedIn: 'root' })
export class RentalBookingPreviewStore {
  private readonly records = signal<readonly PreviewRental[]>([]);
  private sequence = 0;

  rentals(owner: number): readonly PreviewRental[] {
    return this.records().filter(rental => rental.owner === owner);
  }

  simulate(owner: number, vehicle: RentalVehicle, dates: RentalDates, days: number): PreviewRental {
    const record: PreviewRental = {
      reference: 'DEMO-' + (++this.sequence).toString().padStart(3, '0'),
      owner, vehicle, dates, days, estimate: previewEstimate(vehicle.price_per_day, days),
      status: 'pending', paymentStatus: 'unpaid',
    };
    this.records.update(records => [record, ...records]);
    return record;
  }

  cancel(owner: number, reference: string): boolean {
    const rental = this.rentals(owner).find(record => record.reference === reference);
    if (!rental || !canCancelPreview(rental)) return false;
    this.records.update(records => records.map(record => record === rental
      ? { ...record, status: 'cancelled', cancelledAt: new Date().toISOString() } : record));
    return true;
  }
}
