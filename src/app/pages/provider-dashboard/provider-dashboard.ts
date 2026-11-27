import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  ProviderAccountService, ProviderDashboardData, providerError,
} from '../../core/services/provider-account.service';
import { ProviderAuthService } from '../../core/services/provider-auth.service';
import { ProviderService } from '../../core/services/provider.service';
import { HomestayBookingDetails, TravelerContact } from '../../core/models/provider.models';
import { formatLkr } from '../../core/models/wallet.models';
import { ProviderPreviewService } from '../../provider/provider-preview.service';

@Component({
  selector: 'app-provider-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './provider-dashboard.html',
  styleUrl: '../../provider/account/provider-account.scss',
})
export class ProviderDashboard implements OnInit {
  readonly account = inject(ProviderAccountService);
  private readonly auth = inject(ProviderAuthService);
  private readonly services = inject(ProviderService);
  private readonly preview = inject(ProviderPreviewService);
  private readonly destroy = inject(DestroyRef);
  readonly previewMode = this.preview.isPreview;
  readonly previewParams = this.preview.queryParams;
  readonly previewBookings = this.preview.dashboardBookings;
  readonly previewStats = this.preview.dashboardStats;
  readonly business = computed(() => this.account.profile()?.business_name ||
    this.auth.currentProviderUser()?.business_name);
  readonly data = signal<ProviderDashboardData | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly titles = signal<Record<number, string>>({});
  readonly contacts = signal<Record<number, TravelerContact>>({});
  readonly formatLkr = formatLkr;
  readonly serviceMetrics = [
    ['total_services', 'Total services'], ['published_services', 'Published'],
    ['pending_verification_services', 'Pending verification'], ['rejected_services', 'Rejected'],
  ] as const;
  readonly bookingMetrics = [
    ['total_bookings', 'Total bookings'], ['pending_bookings', 'Pending'],
    ['confirmed_bookings', 'Confirmed'], ['completed_bookings', 'Completed'],
    ['cancelled_bookings', 'Cancelled'],
  ] as const;

  ngOnInit(): void { if (!this.previewMode()) this.refresh(); }

  refresh(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.account.dashboard().pipe(
      takeUntilDestroyed(this.destroy), finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (data) => { this.data.set(data); this.enrich(data); },
      error: (error) => this.error.set(providerError(error, 'Could not load the dashboard.')),
    });
  }
  paymentStatus(booking: HomestayBookingDetails): string {
    const status = booking.payments?.at(-1)?.status;
    return status ? status.replaceAll('_', ' ') : 'No payment recorded';
  }
  private enrich(data: ProviderDashboardData): void {
    const rows = new Map([...data.recent_bookings, ...data.upcoming_bookings]
      .map((booking) => [booking.id, booking]));
    const listingIds = [...new Set([...rows.values()].map((booking) => booking.listing_id))];
    const listings = listingIds.map((id) => this.services.getProviderListing(id)
      .pipe(catchError(() => of(null))));
    if (listings.length > 0) forkJoin(listings).pipe(takeUntilDestroyed(this.destroy)).subscribe((items) => {
      if (this.data() !== data) return;
      this.titles.set(Object.fromEntries(items.flatMap((item) =>
        item ? [[item.listing.id, item.listing.title]] : [])));
    });
    const bookings = [...rows.values()].filter((item) => !item.traveler_contact)
      .map((item) => this.services.getProviderBooking(item.id).pipe(catchError(() => of(null))));
    if (bookings.length > 0) forkJoin(bookings).pipe(takeUntilDestroyed(this.destroy)).subscribe((items) => {
      if (this.data() !== data) return;
      this.contacts.set(Object.fromEntries(items.flatMap((item) =>
        item?.traveler_contact ? [[item.id, item.traveler_contact]] : [])));
    });
  }
}
