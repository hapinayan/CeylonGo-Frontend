/**
 * Module 14 — Reports & Analytics Models
 * Matches backend `admin_reports.py` and dashboard metrics contracts.
 */

export interface BookingStatusCount {
  status: string;
  count: number;
}

export interface BookingVolumeReport {
  module: 'homestay' | 'rental_vehicle' | 'tour_guide' | 'all' | string;
  created_from: string;
  created_before: string;
  total: number;
  by_status: BookingStatusCount[];
}

export interface CategoryMetricDistribution {
  category: string;
  label: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface PlatformAnalyticsOverview {
  total_travelers: number;
  active_travelers: number;
  total_providers: number;
  verified_providers: number;
  total_revenue_lkr: number;
  commission_revenue_lkr: number;
  category_distribution: CategoryMetricDistribution[];
  recent_booking_volume: BookingVolumeReport[];
  period: string;
}
