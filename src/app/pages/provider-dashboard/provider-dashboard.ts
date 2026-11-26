import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderService } from '../../core/services/provider.service';
import { ProviderPreviewService } from '../../provider/provider-preview.service';
import {
  ProviderBookingItem,
  ProviderDashboardStats,
  ProviderListingItem,
} from '../../core/models/provider.models';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './provider-dashboard.html',
  styleUrl: './provider-dashboard.scss',
})
export class ProviderDashboard implements OnInit {
  private readonly providerAuthService = inject(ProviderAuthService);
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly router = inject(Router);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;
  readonly user = computed(() => {
    if (this.isPreview()) {
      return this.previewService.previewUser;
    }
    return this.providerAuthService.currentProviderUser();
  });

  readonly isLoading = signal<boolean>(true);
  readonly stats = signal<ProviderDashboardStats>({
    total_listings: 0,
    published_listings: 0,
    pending_approvals: 0,
    total_bookings: 0,
  });
  readonly rentalStats = signal({
    totalListings: 0,
    publishedVehicles: 0,
    pendingVerification: 0,
    upcomingBookings: 0,
  });
  readonly recentBookings = signal<ProviderBookingItem[]>([]);
  readonly pendingListings = signal<ProviderListingItem[]>([]);

  ngOnInit(): void {
    if (!this.isPreview() && typeof this.providerAuthService.getProfile === 'function') {
      this.providerAuthService.getProfile().subscribe({
        next: (profile) => {
          if (profile.verification_status !== 'approved') {
            this.providerAuthService.logout();
            void this.router.navigate(['/provider/login']);
          }
        },
        error: () => {
          // If in test or offline environment without backend profile, allow gracefully
        },
      });
    }

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);

    if (this.isPreview()) {
      this.stats.set(this.previewService.dashboardStats);
      this.recentBookings.set(this.previewService.dashboardBookings);
      const previewList = this.previewService.sampleListings || [];
      const previewBookings = this.previewService.sampleBookings || [];
      const rentalIds = new Set(
        previewList
          .filter((l) => l.listing.category === 'bike' || l.listing.category === 'bicycle')
          .map((l) => l.listing.id)
      );
      this.rentalStats.set({
        totalListings: rentalIds.size,
        publishedVehicles: previewList
          .filter(
            (l) =>
              rentalIds.has(l.listing.id) &&
              l.verification_status === 'approved' &&
              l.listing.is_active
          )
          .reduce(
            (sum, l) =>
              sum +
              (Array.isArray(l.listing.units) && l.listing.units.length > 0
                ? l.listing.units.filter((u: any) => u?.is_active !== false).length
                : 1),
            0
          ),
        pendingVerification: previewList.filter(
          (l) =>
            rentalIds.has(l.listing.id) &&
            (l.verification_status === 'pending' ||
              l.verification_status === 'more_evidence_required')
        ).length,
        upcomingBookings: previewBookings.filter(
          (b) =>
            rentalIds.has(b.listing_id) &&
            (b.status === 'pending' || b.status === 'confirmed')
        ).length,
      });
      this.pendingListings.set(
        this.previewService.sampleListings
          .filter(
            (l) =>
              l.verification_status === 'pending' ||
              l.verification_status === 'more_evidence_required'
          )
          .map((l) => ({
            id: l.listing.id,
            title: l.listing.title,
            category: l.listing.category as ProviderListingItem['category'],
            approval_status: l.verification_status,
            is_active: l.listing.is_active,
            locality: l.listing.locality,
            district: l.listing.district,
          }))
      );
      this.isLoading.set(false);
      return;
    }

    if (this.providerService && typeof this.providerService.getDashboardStats === 'function') {
      this.providerService.getDashboardStats().subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
    } else {
      this.isLoading.set(false);
    }

    let rentalListingIds = new Set<number>();

    if (this.providerService && typeof this.providerService.getMyListings === 'function') {
      this.providerService.getMyListings().subscribe({
        next: (listings) => {
          const pending = listings.filter((l: any) => {
            const st = l.verification_status ?? l.approval_status;
            return (
              st === 'pending' ||
              st === 'pending_approval' ||
              st === 'more_evidence_required'
            );
          });
          this.pendingListings.set(
            pending.map((l: any) =>
              l.listing
                ? {
                    id: l.listing.id,
                    title: l.listing.title,
                    category: l.listing.category,
                    approval_status: l.verification_status,
                    is_active: l.listing.is_active,
                  }
                : l
            )
          );

          const rentals = listings.filter((l: any) => {
            const cat = l.listing?.category ?? l.category;
            return cat === 'bike' || cat === 'bicycle';
          });
          rentalListingIds = new Set(rentals.map((r: any) => r.listing?.id ?? r.id));
          const publishedVehicles = rentals
            .filter((r: any) => {
              const st = r.verification_status ?? r.approval_status;
              const active = r.listing?.is_active ?? r.is_active;
              return st === 'approved' && active;
            })
            .reduce((sum: number, r: any) => {
              const units = r.listing?.units;
              if (Array.isArray(units) && units.length > 0) {
                return sum + units.filter((u: any) => u?.is_active !== false).length;
              }
              return sum + 1;
            }, 0);
          const pendingRentalCount = rentals.filter((r: any) => {
            const st = r.verification_status ?? r.approval_status;
            return st === 'pending' || st === 'more_evidence_required';
          }).length;

          this.rentalStats.update((curr) => ({
            ...curr,
            totalListings: rentals.length,
            publishedVehicles,
            pendingVerification: pendingRentalCount,
          }));
        },
      });
    }

    if (this.providerService && typeof this.providerService.getMyBookings === 'function') {
      this.providerService.getMyBookings().subscribe({
        next: (bookings) => {
          const normalized = bookings.slice(0, 5).map((b: any) => ({
            id: b.id,
            listing_id: b.listing_id,
            listing_title: b.listing_title || b.booking_reference || `Listing #${b.listing_id}`,
            traveler_name: b.traveler_name || b.traveler_contact?.full_name || `Traveler #${b.traveler_id}`,
            traveler_email: b.traveler_email || b.traveler_contact?.email || '',
            check_in: b.check_in || (b.starts_at ? String(b.starts_at).slice(0, 10) : ''),
            check_out: b.check_out || (b.ends_at ? String(b.ends_at).slice(0, 10) : ''),
            guests: b.guests ?? b.quantity ?? 1,
            total_price: b.total_price ?? Number(b.total_amount || 0),
            payment_status: b.payment_status || b.payments?.[0]?.status || 'unpaid',
            status: b.status,
            created_at: b.created_at,
          }));
          this.recentBookings.set(normalized);

          const upcomingRentals = bookings.filter(
            (b: any) =>
              (rentalListingIds.has(b.listing_id) ||
                String(b.booking_reference || '').startsWith('RENT-')) &&
              (b.status === 'pending' || b.status === 'confirmed')
          ).length;
          this.rentalStats.update((curr) => ({
            ...curr,
            upcomingBookings: upcomingRentals,
          }));
        },
      });
    }
  }

  onLogout(): void {
    if (this.isPreview()) {
      this.previewService.disable();
      void this.router.navigate(['/provider/login']);
      return;
    }
    this.providerAuthService.logout();
    void this.router.navigate(['/provider/login']);
  }
}
