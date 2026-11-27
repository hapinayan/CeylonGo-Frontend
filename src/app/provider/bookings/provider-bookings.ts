import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';

import {
  BookingStatusUpdateRequest,
  HomestayBookingDetails,
  ListingCategory,
  ReviewListing,
} from '../../core/models/provider.models';
import {
  CommissionPreview,
  InsufficientBalanceDetail,
  TopUpResult,
  formatLkr,
  formatRatePercent,
  parseWalletApiError,
  toAmountNumber,
} from '../../core/models/wallet.models';
import { ProviderService } from '../../core/services/provider.service';
import { WalletService } from '../../core/services/wallet.service';
import { ProviderPreviewService } from '../provider-preview.service';
import { WalletTopupModalComponent } from '../wallet/components/wallet-topup-modal/wallet-topup-modal';

export type BookingModalAction = 'confirm' | 'reject' | 'complete' | 'cancel';

@Component({
  selector: 'app-provider-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, WalletTopupModalComponent],
  templateUrl: './provider-bookings.html',
  styleUrl: './provider-bookings.scss',
})
export class ProviderBookings implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly walletService = inject(WalletService, { optional: true });
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  readonly bookingDetails = signal<HomestayBookingDetails | null>(null);
  readonly detailsLoading = signal(false);
  readonly detailsError = signal('');

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoading = signal<boolean>(true);
  readonly bookings = signal<HomestayBookingDetails[]>([]);
  readonly listingsMap = signal<Record<number, ReviewListing>>({});
  readonly selectedFilter = signal<string>('all');
  readonly selectedCategory = signal<'all' | 'rentals' | ListingCategory>('all');
  readonly selectedListingId = signal<number | null>(null);
  readonly searchQuery = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly actionErrorMessage = signal<string | null>(null);
  readonly bookingBannerMessage = signal<string | null>(null);

  // Action Dialog State
  readonly activeBooking = signal<HomestayBookingDetails | null>(null);
  readonly actionType = signal<BookingModalAction | null>(null);
  readonly isActionModalOpen = signal<boolean>(false);
  rejectReason = '';
  isUpdating = false;

  // Commission Preview & Top-up Recovery State
  readonly isLoadingCommissionPreview = signal<boolean>(false);
  readonly commissionPreview = signal<CommissionPreview | null>(null);
  readonly commissionPreviewError = signal<string | null>(null);
  readonly insufficientBalance = signal<InsufficientBalanceDetail | null>(null);
  readonly isTopupModalOpen = signal<boolean>(false);

  readonly hasInsufficientBalance = computed(() => {
    if (this.insufficientBalance()) return true;
    const preview = this.commissionPreview();
    return preview ? toAmountNumber(preview.shortfall) > 0 : false;
  });

  readonly requiredTopupAmount = computed(() => {
    const conflict = this.insufficientBalance();
    if (conflict) return toAmountNumber(conflict.shortfall);
    const preview = this.commissionPreview();
    return preview ? toAmountNumber(preview.shortfall) : 0;
  });

  readonly remainingBalanceAfterDeduction = computed(() => {
    const preview = this.commissionPreview();
    if (!preview) return 0;
    return Math.max(
      0,
      toAmountNumber(preview.wallet_balance) - toAmountNumber(preview.required_commission)
    );
  });

  ngOnInit(): void {
    const queryCategory = this.route.snapshot.queryParamMap.get('category');
    if (
      queryCategory === 'adventure' ||
      queryCategory === 'homestay' ||
      queryCategory === 'guide' ||
      queryCategory === 'bike' ||
      queryCategory === 'bicycle' ||
      queryCategory === 'rentals'
    ) {
      this.selectedCategory.set(queryCategory);
    }
    const queryListingId = Number(
      this.route.snapshot.queryParamMap.get('listingId')
    );
    if (Number.isInteger(queryListingId) && queryListingId > 0) {
      this.selectedListingId.set(queryListingId);
    }

    this.loadListingsDirectory();
    this.loadBookings();
    const bookingId = Number(this.route.snapshot.queryParamMap.get('bookingId'));
    if (Number.isSafeInteger(bookingId) && bookingId > 0) this.showDetails(bookingId);
  }

  showDetails(id: number): void {
    if (this.detailsLoading()) return;
    this.detailsError.set('');
    this.bookingDetails.set(null);
    this.detailsLoading.set(true);
    this.providerService.getProviderBooking(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (booking) => {
        this.bookingDetails.set(booking);
        if (!booking) this.detailsError.set('This booking could not be found.');
        this.detailsLoading.set(false);
      },
      error: (error) => {
        this.detailsError.set(parseWalletApiError(error, 'Could not load booking details.').message);
        this.detailsLoading.set(false);
      },
    });
  }

  loadListingsDirectory(): void {
    if (typeof this.providerService.getProviderListings !== 'function') {
      return;
    }
    this.providerService
      .getProviderListings(100, 0)
      .pipe(catchError(() => of([] as ReviewListing[])))
      .subscribe((reviews) => {
        const map: Record<number, ReviewListing> = {};
        for (const rev of reviews) {
          map[rev.listing.id] = rev;
        }
        this.listingsMap.set(map);
      });
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const filter = this.selectedFilter();
    const statusParam = filter === 'all' ? undefined : filter;
    const cat = this.selectedCategory();

    const request$ =
      cat === 'rentals'
        ? forkJoin({
            bikes: this.providerService.getProviderBookings(statusParam, 'bike'),
            bicycles: this.providerService.getProviderBookings(statusParam, 'bicycle'),
          }).pipe(map(({ bikes, bicycles }) => [...bikes, ...bicycles]))
        : cat === 'all'
          ? this.providerService.getProviderBookings(statusParam)
          : this.providerService.getProviderBookings(statusParam, cat);

    request$.subscribe({
      next: (items) => {
        this.bookings.set(items);
        this.isLoading.set(false);
        this.enrichBookingContacts(items);
      },
      error: (err) => {
        console.error('Error loading provider bookings:', err);
        this.errorMessage.set('Failed to load reservations. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(status: string): void {
    this.selectedFilter.set(status);
    this.loadBookings();
  }

  onCategoryChange(category: 'all' | 'rentals' | ListingCategory): void {
    this.selectedCategory.set(category);
    this.selectedListingId.set(null);
    this.loadBookings();
  }

  clearListingFilter(): void {
    this.selectedListingId.set(null);
  }

  filteredBookings(): HomestayBookingDetails[] {
    const query = this.searchQuery().toLowerCase().trim();
    const listingFilter = this.selectedListingId();
    const listings = this.listingsMap();

    return this.bookings().filter((b) => {
      if (listingFilter !== null && b.listing_id !== listingFilter) {
        return false;
      }
      if (query) {
        const listingTitle = listings[b.listing_id]?.listing.title?.toLowerCase() || '';
        const pkgLabel = this.guidePackageLabel(b)?.toLowerCase() || '';
        const travelerName = b.traveler_contact?.full_name?.toLowerCase() || '';
        const travelerEmail = b.traveler_contact?.email?.toLowerCase() || '';
        const ref = b.booking_reference?.toLowerCase() || '';
        const matchesId = String(b.id).includes(query);
        const matchesListing = String(b.listing_id).includes(query);
        const matchesTraveler = String(b.traveler_id).includes(query);
        const matchesKey = b.request_key ? b.request_key.toLowerCase().includes(query) : false;
        if (
          !matchesId &&
          !matchesListing &&
          !matchesTraveler &&
          !matchesKey &&
          !listingTitle.includes(query) &&
          !pkgLabel.includes(query) &&
          !travelerName.includes(query) &&
          !travelerEmail.includes(query) &&
          !ref.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  listingTitle(booking: HomestayBookingDetails): string {
    return (
      this.listingsMap()[booking.listing_id]?.listing.title ||
      `Listing #${booking.listing_id}`
    );
  }

  isAdventureBooking(booking: HomestayBookingDetails): boolean {
    const rev = this.listingsMap()[booking.listing_id];
    if (rev) {
      return rev.listing.category === 'adventure';
    }
    return Boolean(booking.slot_id) && (!booking.room_ids || booking.room_ids.length === 0);
  }

  isGuideBooking(booking: HomestayBookingDetails): boolean {
    const rev = this.listingsMap()[booking.listing_id];
    if (rev) {
      return rev.listing.category === 'guide';
    }
    return Boolean(booking.booking_reference?.startsWith('GUIDE-'));
  }

  isRentalBooking(booking: HomestayBookingDetails): boolean {
    const rev = this.listingsMap()[booking.listing_id];
    if (rev) {
      return rev.listing.category === 'bike' || rev.listing.category === 'bicycle';
    }
    return Boolean(booking.booking_reference?.startsWith('RENT-'));
  }

  rentalDurationDays(booking: HomestayBookingDetails): number {
    const start = Date.parse(booking.starts_at);
    const end = Date.parse(booking.ends_at);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
    return Math.max(1, Math.ceil((end - start) / 86_400_000));
  }

  isSlotScheduledBooking(booking: HomestayBookingDetails): boolean {
    return this.isAdventureBooking(booking) || this.isGuideBooking(booking);
  }

  supportsCompletionOrCancellation(booking: HomestayBookingDetails): boolean {
    return booking.status === 'confirmed';
  }

  guidePackageLabel(booking: HomestayBookingDetails): string {
    if (!this.isGuideBooking(booking)) return '';
    const rev = this.listingsMap()[booking.listing_id];
    const unitId = booking.room_ids?.[0];
    if (!rev || !unitId) return 'Scheduled Tour Package';
    const pkgs = Array.isArray(rev.details?.['packages'])
      ? (rev.details['packages'] as { id: number; title: string }[])
      : [];
    const matched =
      pkgs.find((p) => p.id === unitId) ||
      rev.listing.units?.find((u: any) => u.id === unitId);
    return matched?.title || matched?.label || `Package #${unitId}`;
  }

  bookingReferenceLabel(booking: HomestayBookingDetails): string {
    if (booking.booking_reference) {
      return booking.booking_reference;
    }
    return `#${booking.id}`;
  }

  formatAdventureSchedule(booking: HomestayBookingDetails): string {
    const start = new Date(booking.starts_at);
    const end = new Date(booking.ends_at);
    if (Number.isNaN(start.getTime())) {
      return `${booking.starts_at} → ${booking.ends_at}`;
    }
    const datePart = start.toLocaleDateString('en-LK', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const startTime = start.toLocaleTimeString('en-LK', {
      timeZone: 'Asia/Colombo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const endTime = Number.isNaN(end.getTime())
      ? ''
      : end.toLocaleTimeString('en-LK', {
          timeZone: 'Asia/Colombo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
    return endTime ? `${datePart} · ${startTime} – ${endTime}` : `${datePart} · ${startTime}`;
  }

  paymentMethodLabel(booking: HomestayBookingDetails): string {
    const payment = booking.payments?.at(-1);
    if (!payment) return '';
    const raw = String(
      payment.provider || payment.payment_method || payment.method || ''
    ).toLowerCase();
    if (raw.includes('location') || raw.includes('cash') || raw.includes('arrival')) {
      return 'Pay at Location';
    }
    if (raw === 'simulated' || raw.includes('demo') || raw.includes('online') || raw.includes('card')) {
      return 'Academic Demo Online Payment';
    }
    return payment.provider || payment.payment_method || '';
  }

  paymentStatusValue(booking: HomestayBookingDetails): string {
    const payment = booking.payments?.at(-1);
    if (!payment) {
      return 'not_recorded';
    }
    return String(payment.status || 'unpaid').toLowerCase();
  }

  paymentStatusLabel(booking: HomestayBookingDetails): string {
    const status = this.paymentStatusValue(booking);
    if (status === 'unpaid') return 'Unpaid';
    if (status === 'not_recorded') return 'No payment recorded';
    if (
      status === 'paid' ||
      status === 'completed' ||
      status === 'succeeded' ||
      status === 'demo_succeeded'
    ) {
      return status === 'completed' ? 'Completed' : 'Paid (Demo)';
    }
    if (status === 'failed' || status === 'demo_failed') return 'Failed';
    if (status === 'refunded') return 'Refunded';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  promptAction(booking: HomestayBookingDetails, action: BookingModalAction): void {
    this.activeBooking.set(booking);
    this.actionType.set(action);
    this.rejectReason = '';
    this.actionErrorMessage.set(null);
    this.commissionPreview.set(null);
    this.commissionPreviewError.set(null);
    this.insufficientBalance.set(null);
    this.isActionModalOpen.set(true);

    if (action === 'confirm' && !this.isPreview()) {
      this.loadCommissionPreview(booking.id);
    }
  }

  loadCommissionPreview(bookingId: number): void {
    if (!this.walletService || typeof this.walletService.getBookingCommissionPreview !== 'function') {
      return;
    }

    this.isLoadingCommissionPreview.set(true);
    this.commissionPreviewError.set(null);

    this.walletService.getBookingCommissionPreview(bookingId).subscribe({
      next: (preview) => {
        this.commissionPreview.set(preview);
        this.isLoadingCommissionPreview.set(false);
        if (toAmountNumber(preview.shortfall) > 0) {
          this.insufficientBalance.set({
            code: 'insufficient_wallet_balance',
            message: 'Top up your wallet before confirming this booking.',
            currency: 'LKR',
            current_balance: String(preview.wallet_balance),
            required_commission: String(preview.required_commission),
            shortfall: String(preview.shortfall),
          });
        } else {
          this.insufficientBalance.set(null);
        }
      },
      error: (err) => {
        const parsed = parseWalletApiError(err, 'Failed to load commission preview.');
        this.commissionPreviewError.set(parsed.message);
        this.isLoadingCommissionPreview.set(false);
      },
    });
  }

  openTopupFromBooking(): void {
    this.isTopupModalOpen.set(true);
  }

  closeTopupFromBooking(): void {
    this.isTopupModalOpen.set(false);
  }

  onBookingTopUpSucceeded(_result: TopUpResult): void {
    this.isTopupModalOpen.set(false);
    this.actionErrorMessage.set(null);
    this.insufficientBalance.set(null);

    const booking = this.activeBooking();
    if (booking && this.actionType() === 'confirm') {
      this.loadCommissionPreview(booking.id);
    }
  }

  closeActionModal(): void {
    this.isActionModalOpen.set(false);
    this.activeBooking.set(null);
    this.actionType.set(null);
    this.rejectReason = '';
    this.actionErrorMessage.set(null);
    this.commissionPreview.set(null);
    this.commissionPreviewError.set(null);
    this.insufficientBalance.set(null);
    this.isLoadingCommissionPreview.set(false);
    this.isUpdating = false;
  }

  confirmAction(): void {
    const booking = this.activeBooking();
    const action = this.actionType();
    if (!booking || !action || this.isUpdating) return;

    if (this.isPreview()) {
      this.actionErrorMessage.set('Booking status updates are disabled in Preview Mode.');
      return;
    }

    if (action === 'confirm' && this.walletService && !this.commissionPreview()) {
      this.actionErrorMessage.set('Load the commission preview before confirming.');
      return;
    }
    if (action === 'confirm' && this.commissionPreview()?.confirmation_allowed === false &&
        !this.hasInsufficientBalance()) {
      this.actionErrorMessage.set('The booking is not currently eligible for confirmation.');
      return;
    }

    if (action === 'confirm' && this.hasInsufficientBalance()) {
      this.actionErrorMessage.set(
        `Insufficient wallet balance. Top up ${this.formatAmount(this.requiredTopupAmount())} before confirming.`
      );
      return;
    }

    this.isUpdating = true;
    this.actionErrorMessage.set(null);

    const statusMap: Record<BookingModalAction, BookingStatusUpdateRequest['to_status']> = {
      confirm: 'confirmed',
      reject: 'rejected',
      complete: 'completed',
      cancel: 'cancelled',
    };
    const targetStatus = statusMap[action];
    const needsReason = targetStatus === 'rejected' || targetStatus === 'cancelled';

    const payload: BookingStatusUpdateRequest = {
      to_status: targetStatus,
      reason:
        needsReason && this.rejectReason.trim()
          ? this.rejectReason.trim()
          : null,
    };

    this.providerService.updateBookingStatus(booking.id, payload).subscribe({
      next: (updated) => {
        const authoritativeStatus =
          (updated?.status as HomestayBookingDetails['status'] | undefined) || targetStatus;
        this.bookings.update((list) =>
          list.map((b) =>
            b.id === booking.id
              ? { ...b, ...(updated || {}), id: booking.id, status: authoritativeStatus }
              : b
          )
        );
        if (authoritativeStatus === 'confirmed') {
          const prev = this.commissionPreview();
          this.bookingBannerMessage.set(
            prev?.free_booking_eligible
              ? `Booking ${this.bookingReferenceLabel(booking)} confirmed using a commission-free booking.`
              : `Booking ${this.bookingReferenceLabel(booking)} confirmed.`
          );
        }
        if (this.bookingDetails()?.id === booking.id) this.showDetails(booking.id);
        this.isUpdating = false;
        this.closeActionModal();
      },
      error: (err) => {
        console.error('Error updating booking status:', err);
        const parsed = parseWalletApiError(err, 'Failed to update reservation status.');
        if (parsed.insufficientBalance) {
          // Keep booking pending and expose Top Up recovery flow
          this.insufficientBalance.set(parsed.insufficientBalance);
          this.actionErrorMessage.set(parsed.insufficientBalance.message);
        } else {
          this.actionErrorMessage.set(parsed.message);
        }
        this.isUpdating = false;
      },
    });
  }

  modalTitle(): string {
    switch (this.actionType()) {
      case 'confirm':
        return 'Confirm Reservation';
      case 'reject':
        return 'Decline Reservation';
      case 'complete':
        return 'Mark Booking Completed';
      case 'cancel':
        return 'Cancel Confirmed Booking';
      default:
        return 'Update Reservation';
    }
  }

  modalSubmitLabel(): string {
    if (this.isUpdating) return 'Updating...';
    switch (this.actionType()) {
      case 'confirm':
        return 'Yes, Confirm Booking';
      case 'reject':
        return 'Yes, Decline Booking';
      case 'complete':
        return 'Yes, Mark Completed';
      case 'cancel':
        return 'Yes, Cancel Booking';
      default:
        return 'Confirm';
    }
  }

  formatAmount(val: string | number | null | undefined): string {
    return formatLkr(val);
  }

  formatRate(rate: string | number | null | undefined): string {
    return formatRatePercent(rate);
  }

  private enrichBookingContacts(items: HomestayBookingDetails[]): void {
    if (typeof this.providerService.getProviderBooking !== 'function') {
      return;
    }
    const needingContact = items.filter((b) => !b.traveler_contact);
    if (needingContact.length === 0) return;

    forkJoin(
      needingContact.map((b) =>
        this.providerService
          .getProviderBooking(b.id)
          .pipe(catchError(() => of(null)))
      )
    ).subscribe((detailsList) => {
      const detailMap = new Map<number, HomestayBookingDetails>();
      for (const detail of detailsList) {
        if (detail) {
          detailMap.set(detail.id, detail);
        }
      }
      if (detailMap.size === 0) return;

      this.bookings.update((current) =>
        current.map((b) => {
          const full = detailMap.get(b.id);
          return full ? { ...b, ...full } : b;
        })
      );
    });
  }
}
