import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';

import {
  ACTIVITY_CATEGORIES,
  EvidenceFileKind,
  GUIDE_BACKEND_CATEGORIES,
  GuideProfileMetadataPayload,
  ListingCategory,
  ReviewListing,
} from '../../core/models/provider.models';
import { ProviderService } from '../../core/services/provider.service';
import { ProviderPreviewService } from '../provider-preview.service';

@Component({
  selector: 'app-provider-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './provider-listings.html',
  styleUrl: './provider-listings.scss',
})
export class ProviderListings implements OnInit, OnDestroy {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoading = signal<boolean>(true);
  readonly listings = signal<ReviewListing[]>([]);
  readonly selectedFilter = signal<string>('all');
  readonly selectedCategory = signal<'all' | 'rentals' | ListingCategory>('all');
  readonly searchQuery = signal<string>('');
  readonly apiError = signal<string | null>(null);
  readonly coverPreviews = signal<Record<number, SafeUrl | string>>({});

  // Verification Feedback Modal State
  readonly isFeedbackModalOpen = signal<boolean>(false);
  readonly activeListing = signal<ReviewListing | null>(null);
  additionalEvidenceNote = '';
  selectedEvidenceKind: EvidenceFileKind = 'business_certificate';
  selectedFile: File | null = null;
  isRedacted = false;
  isResubmitting = false;
  resubmitSuccess = false;
  modalError: string | null = null;

  private readonly objectUrls = new Map<number, string>();

  ngOnInit(): void {
    this.loadListings();
  }

  ngOnDestroy(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  loadListings(): void {
    this.isLoading.set(true);
    this.apiError.set(null);

    this.providerService.getProviderListings().subscribe({
      next: (items) => {
        this.listings.set(items);
        this.isLoading.set(false);
        this.loadCoverPreviews(items);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.apiError.set(this.formatErrorMessage(err));
      },
    });
  }

  filteredListings(): ReviewListing[] {
    const filter = this.selectedFilter();
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.listings().filter((review) => {
      const listing = review.listing;

      if (category === 'rentals') {
        if (listing.category !== 'bike' && listing.category !== 'bicycle') {
          return false;
        }
      } else if (category !== 'all' && listing.category !== category) {
        return false;
      }

      // Status filter
      if (filter !== 'all') {
        if (filter === 'published') {
          if (review.verification_status !== 'approved' || !listing.is_active) return false;
        } else if (filter === 'approved') {
          if (review.verification_status !== 'approved') return false;
        } else if (filter === 'pending') {
          if (review.verification_status !== 'pending') return false;
        } else if (filter === 'action_required') {
          if (review.verification_status !== 'more_evidence_required') return false;
        } else if (filter === 'draft') {
          if (review.verification_status !== 'draft') return false;
        } else if (filter === 'rejected') {
          if (review.verification_status !== 'rejected') return false;
        } else if (filter === 'suspended') {
          if (review.verification_status !== 'suspended') return false;
        }
      }

      // Query filter
      if (query) {
        const matchesTitle = listing.title?.toLowerCase().includes(query);
        const matchesLocality = listing.locality?.toLowerCase().includes(query);
        const matchesDistrict = listing.district?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesLocality && !matchesDistrict) return false;
      }

      return true;
    });
  }

  categoryLabel(review: ReviewListing): string {
    if (review.listing.category === 'adventure') {
      const slug = review.details?.['activity']?.category;
      const matched = ACTIVITY_CATEGORIES.find((c) => c.slug === slug);
      return matched ? matched.label : 'Adventure';
    }
    if (review.listing.category === 'guide') {
      return 'Tour Guide';
    }
    if (review.listing.category === 'bike') {
      const sub = String(review.details?.['rental']?.subtype || '');
      return sub === 'scooter' ? 'Scooter' : 'Motorbike';
    }
    if (review.listing.category === 'bicycle') {
      const sub = String(review.details?.['rental']?.subtype || '');
      return sub ? `${sub.charAt(0).toUpperCase() + sub.slice(1)} Bicycle` : 'Bicycle';
    }
    return review.listing.category;
  }

  priceUnitLabel(review: ReviewListing): string {
    if (review.listing.category === 'adventure') return '/ participant';
    if (review.listing.category === 'guide') return 'starting';
    if (review.listing.category === 'bike' || review.listing.category === 'bicycle') {
      return '/ day';
    }
    return '/ night';
  }

  isRental(review: ReviewListing): boolean {
    return review.listing.category === 'bike' || review.listing.category === 'bicycle';
  }

  rentalFleetLabel(review: ReviewListing): string {
    if (!this.isRental(review)) return '';
    const count = Array.isArray(review.listing.units) ? review.listing.units.length : 0;
    const active = Array.isArray(review.listing.units)
      ? review.listing.units.filter((u: any) => u?.is_active !== false).length
      : 0;
    return `Fleet: ${active}/${count} active vehicle(s)`;
  }

  guideLanguagesLabel(review: ReviewListing): string {
    if (review.listing.category !== 'guide') return '';
    const guide = review.details?.['guide'] as Partial<GuideProfileMetadataPayload> | undefined;
    if (!Array.isArray(guide?.languages) || guide.languages.length === 0) return '';
    return guide.languages.map((l) => l.language_name).join(', ');
  }

  guideSpecializationsLabel(review: ReviewListing): string {
    if (review.listing.category !== 'guide') return '';
    const guide = review.details?.['guide'] as Partial<GuideProfileMetadataPayload> | undefined;
    if (!Array.isArray(guide?.categories) || guide.categories.length === 0) return '';
    return guide.categories
      .map((slug) => GUIDE_BACKEND_CATEGORIES.find((c) => c.slug === slug)?.name || slug)
      .join(', ');
  }

  coverImageSrc(review: ReviewListing): SafeUrl | string | null {
    const id = review.listing.id;
    const loaded = this.coverPreviews()[id];
    if (loaded) return loaded;
    const firstMedia = review.listing.media?.[0];
    return firstMedia?.image_url || null;
  }

  canEdit(review: ReviewListing): boolean {
    return review.verification_status !== 'suspended';
  }

  canSubmit(review: ReviewListing): boolean {
    return (
      review.verification_status === 'draft' ||
      review.verification_status === 'rejected' ||
      review.verification_status === 'more_evidence_required'
    );
  }

  editListing(review: ReviewListing): void {
    if (review.listing.category === 'adventure') {
      void this.router.navigate(
        ['/provider/activities', review.listing.id, 'edit'],
        { queryParams: this.previewQueryParams() }
      );
      return;
    }
    if (review.listing.category === 'guide') {
      void this.router.navigate(
        ['/provider/guides', review.listing.id, 'edit'],
        { queryParams: this.previewQueryParams() }
      );
      return;
    }
    if (this.isRental(review)) {
      void this.router.navigate(
        ['/provider/rentals', review.listing.id, 'edit'],
        { queryParams: this.previewQueryParams() }
      );
      return;
    }
    this.continueDraft();
  }

  submitDraftListing(listingId: number): void {
    if (this.isPreview()) {
      this.apiError.set('Listing submission is disabled in Preview Mode.');
      return;
    }
    this.apiError.set(null);
    this.providerService.submitListing(listingId).subscribe({
      next: (updated) => {
        this.listings.update((items) =>
          items.map((i) => (i.listing.id === listingId ? updated : i))
        );
      },
      error: (err) => {
        this.apiError.set(this.formatErrorMessage(err));
      },
    });
  }

  publishListing(listingId: number): void {
    if (this.isPreview()) {
      this.apiError.set('Publishing is disabled in Preview Mode.');
      return;
    }
    this.apiError.set(null);
    this.providerService.publishListing(listingId).subscribe({
      next: (updated) => {
        this.listings.update((items) =>
          items.map((i) => (i.listing.id === listingId ? updated : i))
        );
      },
      error: (err) => {
        this.apiError.set(this.formatErrorMessage(err));
      },
    });
  }

  unpublishListing(listingId: number): void {
    if (this.isPreview()) {
      this.apiError.set('Unpublishing is disabled in Preview Mode.');
      return;
    }
    this.apiError.set(null);
    this.providerService.unpublishListing(listingId).subscribe({
      next: (updated) => {
        this.listings.update((items) =>
          items.map((i) => (i.listing.id === listingId ? updated : i))
        );
      },
      error: (err) => {
        this.apiError.set(this.formatErrorMessage(err));
      },
    });
  }

  openFeedbackModal(review: ReviewListing): void {
    this.activeListing.set(review);
    this.additionalEvidenceNote = '';
    this.selectedEvidenceKind =
      review.listing.category === 'adventure'
        ? 'safety'
        : review.listing.category === 'guide'
          ? 'license'
          : this.isRental(review)
            ? 'vehicle_registration'
            : 'business_certificate';
    this.selectedFile = null;
    this.isRedacted = false;
    this.isResubmitting = false;
    this.resubmitSuccess = false;
    this.modalError = null;
    this.isFeedbackModalOpen.set(true);
  }

  closeFeedbackModal(): void {
    this.isFeedbackModalOpen.set(false);
    this.activeListing.set(null);
    this.modalError = null;
  }

  onEvidenceKindChange(): void {
    this.isRedacted = false;
    this.modalError = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.modalError = null;
    }
  }

  resubmitEvidence(): void {
    const review = this.activeListing();
    if (!review) return;

    if (this.isPreview()) {
      this.modalError = 'Evidence upload and resubmission are disabled in Preview Mode.';
      return;
    }

    this.modalError = null;
    if (
      this.selectedFile &&
      this.selectedEvidenceKind === 'customer_feedback' &&
      !this.isRedacted
    ) {
      this.modalError =
        'Please confirm all personal contact details are redacted before uploading customer feedback screenshots.';
      return;
    }

    this.isResubmitting = true;
    const listingId = review.listing.id;

    const uploadThenSubmit = () => {
      if (this.selectedFile) {
        this.providerService
          .uploadEvidenceFile(
            listingId,
            this.selectedFile,
            this.selectedEvidenceKind,
            this.selectedEvidenceKind === 'customer_feedback' ? this.isRedacted : false
          )
          .subscribe({
            next: () => this.executeSubmitCall(listingId),
            error: (err) => {
              this.isResubmitting = false;
              this.modalError = this.formatErrorMessage(err);
            },
          });
      } else {
        this.executeSubmitCall(listingId);
      }
    };

    if (this.additionalEvidenceNote.trim()) {
      this.providerService
        .saveEvidence(listingId, {
          links: Array.isArray(review.details?.['links']) ? review.details['links'] : [],
          notes: this.additionalEvidenceNote.trim(),
        })
        .subscribe({
          next: () => uploadThenSubmit(),
          error: (err) => {
            this.isResubmitting = false;
            this.modalError = this.formatErrorMessage(err);
          },
        });
    } else {
      uploadThenSubmit();
    }
  }

  private executeSubmitCall(listingId: number): void {
    this.providerService.submitListing(listingId).subscribe({
      next: (updated) => {
        this.isResubmitting = false;
        this.resubmitSuccess = true;
        this.listings.update((items) =>
          items.map((i) => (i.listing.id === listingId ? updated : i))
        );
        setTimeout(() => this.closeFeedbackModal(), 1600);
      },
      error: (err) => {
        this.isResubmitting = false;
        this.modalError = this.formatErrorMessage(err);
        this.apiError.set(this.modalError);
      },
    });
  }

  continueDraft(): void {
    void this.router.navigate(['/provider/homestays/new'], {
      queryParams: this.previewQueryParams(),
    });
  }

  private loadCoverPreviews(items: ReviewListing[]): void {
    for (const review of items) {
      const firstPhoto = review.listing.media?.[0];
      if (!firstPhoto || firstPhoto.image_url || this.objectUrls.has(review.listing.id)) {
        continue;
      }
      this.providerService.getPhotoBlob(review.listing.id, firstPhoto.id).subscribe({
        next: (blob) => {
          const prev = this.objectUrls.get(review.listing.id);
          if (prev) URL.revokeObjectURL(prev);
          const url = URL.createObjectURL(blob);
          this.objectUrls.set(review.listing.id, url);
          this.coverPreviews.update((curr) => ({
            ...curr,
            [review.listing.id]: this.sanitizer.bypassSecurityTrustUrl(url),
          }));
        },
        error: () => {
          // Non-fatal fallback placeholder
        },
      });
    }
  }

  private formatErrorMessage(err: any): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (err?.status === 401) {
      return 'Session expired. Please sign in to your provider account.';
    }
    if (err?.status === 403) {
      return 'Only approved providers have access to this action.';
    }
    if (err?.status === 404) {
      return 'Listing not found on server.';
    }
    if (err?.status === 409) {
      return 'Listing state conflict. Please refresh the page.';
    }
    if (err?.status === 422) {
      return 'Validation error. Please verify submitted parameters.';
    }
    return err?.message || 'Operation failed. Please check network connection.';
  }
}
