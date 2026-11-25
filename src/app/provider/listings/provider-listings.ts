import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import {
  EvidenceFileKind,
  ReviewListing,
  VerificationStatus,
} from '../../core/models/provider.models';
import { ProviderService } from '../../core/services/provider.service';

@Component({
  selector: 'app-provider-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './provider-listings.html',
  styleUrl: './provider-listings.scss',
})
export class ProviderListings implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(true);
  readonly listings = signal<ReviewListing[]>([]);
  readonly selectedFilter = signal<string>('all');
  readonly searchQuery = signal<string>('');
  readonly apiError = signal<string | null>(null);

  // Verification Feedback Modal State
  readonly isFeedbackModalOpen = signal<boolean>(false);
  readonly activeListing = signal<ReviewListing | null>(null);
  additionalEvidenceNote = '';
  selectedEvidenceKind: EvidenceFileKind = 'business_certificate';
  selectedFile: File | null = null;
  isRedacted = false;
  isResubmitting = false;
  resubmitSuccess = false;

  ngOnInit(): void {
    this.loadListings();
  }

  loadListings(): void {
    this.isLoading.set(true);
    this.apiError.set(null);

    this.providerService.getProviderListings().subscribe({
      next: (items) => {
        this.listings.set(items);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.apiError.set(this.formatErrorMessage(err));
      },
    });
  }

  filteredListings(): ReviewListing[] {
    const filter = this.selectedFilter();
    const query = this.searchQuery().toLowerCase().trim();

    return this.listings().filter((review) => {
      const listing = review.listing;

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

  publishListing(listingId: number): void {
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
    this.selectedFile = null;
    this.isRedacted = false;
    this.isResubmitting = false;
    this.resubmitSuccess = false;
    this.isFeedbackModalOpen.set(true);
  }

  closeFeedbackModal(): void {
    this.isFeedbackModalOpen.set(false);
    this.activeListing.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      if (this.selectedEvidenceKind === 'customer_feedback') {
        this.isRedacted = true;
      }
    }
  }

  resubmitEvidence(): void {
    const review = this.activeListing();
    if (!review) return;

    this.isResubmitting = true;
    const listingId = review.listing.id;

    // 1. If note provided, save evidence note
    if (this.additionalEvidenceNote.trim()) {
      this.providerService
        .saveEvidence(listingId, {
          links: [],
          notes: this.additionalEvidenceNote.trim(),
        })
        .subscribe();
    }

    // 2. If file provided, upload file
    if (this.selectedFile) {
      this.providerService
        .uploadEvidenceFile(
          listingId,
          this.selectedFile,
          this.selectedEvidenceKind,
          this.isRedacted
        )
        .subscribe({
          next: () => this.executeSubmitCall(listingId),
          error: () => this.executeSubmitCall(listingId),
        });
    } else {
      this.executeSubmitCall(listingId);
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
        this.apiError.set(this.formatErrorMessage(err));
      },
    });
  }

  continueDraft(): void {
    void this.router.navigate(['/provider/homestays/new']);
  }

  private formatErrorMessage(err: any): string {
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
