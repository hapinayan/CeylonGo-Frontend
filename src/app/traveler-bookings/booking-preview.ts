import { TravelerBooking } from './booking-model';

export const bookingPreviewEnabled = false;
export const bookingExamples: TravelerBooking[] = [];

export function canSimulateCancellation(_row: TravelerBooking): boolean { return false; }
