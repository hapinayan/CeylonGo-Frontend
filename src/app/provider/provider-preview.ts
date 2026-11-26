import { ProviderUser } from '../core/models/provider-auth.models';
import {
  AvailabilitySlotResponse,
  HomestayBookingDetails,
  ProviderBookingItem,
  ProviderDashboardStats,
  ReviewListing,
} from '../core/models/provider.models';

export const providerPreviewEnabled: boolean = false;

export const PREVIEW_PROVIDER_USER: ProviderUser | null = null;

export const PREVIEW_DASHBOARD_STATS: ProviderDashboardStats = {
  total_listings: 0,
  published_listings: 0,
  pending_approvals: 0,
  total_bookings: 0,
};

export const PREVIEW_LISTINGS: ReviewListing[] = [];
export const PREVIEW_SLOTS: Record<number, AvailabilitySlotResponse[]> = {};
export const PREVIEW_BOOKINGS: HomestayBookingDetails[] = [];
export const PREVIEW_DASHBOARD_BOOKINGS: ProviderBookingItem[] = [];

export function createPreviewPhotoBlob(): Blob {
  return new Blob([], { type: 'image/svg+xml' });
}
