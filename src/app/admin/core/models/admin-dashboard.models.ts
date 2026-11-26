export interface AdminDashboardProviders {
  total_profiles: number;
  pending_applications: number;
}

export interface AdminDashboardBookings {
  homestay?: number | null;
  rental_vehicle?: number | null;
  tour_guide?: number | null;
}

export interface AdminDashboardPendingApprovals {
  homestay_listings: number;
  activity_listings: number;
  eco_experience_listings: number;
  artisan_listings: number;
  rental_vehicles: number;
  tour_guide_profiles: number;
}

export interface AdminDashboardTravelerEligibility {
  pending_rental_checks: number;
}

export interface AdminDashboardResponse {
  providers?: AdminDashboardProviders | null;
  bookings: AdminDashboardBookings;
  pending_approvals?: AdminDashboardPendingApprovals | null;
  traveler_eligibility?: AdminDashboardTravelerEligibility | null;
}
