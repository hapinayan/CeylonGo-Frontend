import { RentalPage, RentalQuery, RentalVehicle } from './rental-models';

export const rentalPreviewEnabled: boolean = false;
export function previewSearch(_query: RentalQuery): RentalPage { return { items: [], total: 0, pages: 0 }; }
export function previewVehicle(_id: number): RentalVehicle | undefined { return undefined; }
