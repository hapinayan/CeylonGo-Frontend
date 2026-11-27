import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import {
  GuidePackageDetails,
  GuidePackagePayload,
  GuidePackagePricingType,
  ListingMediaResponse,
  ReviewListing,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';
import { ProviderPreviewService } from '../../provider-preview.service';

interface PackageGalleryItem {
  media: ListingMediaResponse;
  url: SafeUrl | string | null;
}

@Component({
  selector: 'app-tour-guide-packages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LocationPickerComponent],
  templateUrl: './tour-guide-packages.html',
  styleUrl: './tour-guide-packages.scss',
})
export class TourGuidePackages implements OnInit, OnDestroy {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly isLoading = signal<boolean>(true);
  readonly isLoadingPackages = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingPhoto = signal<boolean>(false);

  readonly guides = signal<ReviewListing[]>([]);
  readonly selectedListingId = signal<number | null>(null);
  readonly packages = signal<GuidePackageDetails[]>([]);
  readonly gallery = signal<PackageGalleryItem[]>([]);
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly selectedGuide = computed(() => {
    const id = this.selectedListingId();
    return this.guides().find((g) => g.listing.id === id) || null;
  });

  readonly filteredPackages = computed(() => {
    const filter = this.statusFilter();
    const list = this.packages();
    if (filter === 'active') return list.filter((p) => p.is_active);
    if (filter === 'inactive') return list.filter((p) => !p.is_active);
    return list;
  });

  // Editor state
  editingPackageId: number | null = null;
  title = '';
  description = '';
  itinerary = '';
  durationHours = 4;
  pricingType: GuidePackagePricingType = 'per_person';
  price = 6500;
  maxPeople = 8;
  includedServices = '';
  excludedServices = '';
  meetingPoint = '';
  useCustomCoordinates = false;
  readonly meetingLat = signal<number>(7.2906);
  readonly meetingLng = signal<number>(80.6337);
  isActive = true;

  private readonly objectUrls = new Map<number, string>();

  ngOnInit(): void {
    const queryId = Number(this.route.snapshot.queryParamMap.get('listingId'));
    this.loadGuides(Number.isInteger(queryId) && queryId > 0 ? queryId : null);
  }

  ngOnDestroy(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  loadGuides(preferredId: number | null = null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.providerService
      .getProviderListings(100, 0, 'guide')
      .pipe(catchError((err) => {
        this.errorMessage.set(this.extractErrorMessage(err, 'Failed to load tour guide listings.'));
        return of([] as ReviewListing[]);
      }))
      .subscribe((items) => {
        this.guides.set(items);
        this.isLoading.set(false);
        if (items.length > 0) {
          const matched = preferredId
            ? items.find((g) => g.listing.id === preferredId)
            : undefined;
          const target = matched || items[0];
          this.selectListing(target.listing.id);
        }
      });
  }

  selectListing(listingId: number): void {
    const numId = Number(listingId);
    if (!Number.isInteger(numId) || numId <= 0) return;

    this.selectedListingId.set(numId);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.resetForm();

    const guide = this.selectedGuide();
    if (guide) {
      this.meetingPoint =
        String(guide.details?.['house_rules'] || '') ||
        guide.listing.locality ||
        '';
      const lat = Number(guide.listing.latitude);
      const lng = Number(guide.listing.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && guide.listing.latitude != null) {
        this.meetingLat.set(lat);
        this.meetingLng.set(lng);
      }
      this.hydrateGallery(guide);
    }

    this.loadPackages(numId);
  }

  loadPackages(listingId: number): void {
    this.isLoadingPackages.set(true);
    this.providerService.getGuidePackages(listingId).subscribe({
      next: (pkgs) => {
        this.packages.set(pkgs);
        this.isLoadingPackages.set(false);
      },
      error: (err) => {
        this.isLoadingPackages.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(err, 'Failed to load packages from server.')
        );
      },
    });
  }

  startEdit(pkg: GuidePackageDetails): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editingPackageId = pkg.id;
    this.title = pkg.title;
    this.description = pkg.description;
    this.itinerary = pkg.itinerary || '';
    this.durationHours = Number(pkg.duration_hours) || 4;
    this.pricingType = pkg.pricing_type;
    this.price = Number(pkg.price) || 5000;
    this.maxPeople = Number(pkg.max_people) || 8;
    this.includedServices = pkg.included_services || '';
    this.excludedServices = pkg.excluded_services || '';
    this.meetingPoint = pkg.meeting_point || '';
    this.isActive = Boolean(pkg.is_active);
    if (pkg.meeting_latitude != null && pkg.meeting_longitude != null) {
      this.meetingLat.set(Number(pkg.meeting_latitude));
      this.meetingLng.set(Number(pkg.meeting_longitude));
      this.useCustomCoordinates = true;
    } else {
      this.useCustomCoordinates = false;
    }
  }

  resetForm(): void {
    this.editingPackageId = null;
    this.title = '';
    this.description = '';
    this.itinerary = '';
    this.durationHours = 4;
    this.pricingType = 'per_person';
    this.price = 6500;
    this.maxPeople = 8;
    this.includedServices = '';
    this.excludedServices = '';
    const guide = this.selectedGuide();
    this.meetingPoint = guide
      ? String(guide.details?.['house_rules'] || guide.listing.locality || '')
      : '';
    this.useCustomCoordinates = false;
    this.isActive = true;
  }

  onCoordinatesChange(coords: { lat: number; lng: number }): void {
    this.meetingLat.set(Number(coords.lat.toFixed(6)));
    this.meetingLng.set(Number(coords.lng.toFixed(6)));
  }

  savePackage(): void {
    const guide = this.selectedGuide();
    if (!guide) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.isPreview()) {
      this.errorMessage.set('Package creation and edits are disabled in Preview Mode.');
      return;
    }
    if (guide.verification_status === 'suspended') {
      this.errorMessage.set('Suspended listings cannot modify tour packages.');
      return;
    }
    if (this.title.trim().length < 3) {
      this.errorMessage.set('Package name must be at least 3 characters.');
      return;
    }
    if (this.description.trim().length < 10) {
      this.errorMessage.set('Description must be at least 10 characters.');
      return;
    }
    if (!this.durationHours || Number(this.durationHours) <= 0) {
      this.errorMessage.set('Duration in hours must be greater than 0.');
      return;
    }
    if (!this.price || Number(this.price) <= 0) {
      this.errorMessage.set('Price in LKR must be greater than 0.');
      return;
    }
    if (!this.maxPeople || Number(this.maxPeople) < 1) {
      this.errorMessage.set('Max travelers must be at least 1.');
      return;
    }
    if (this.meetingPoint.trim().length < 3) {
      this.errorMessage.set('Meeting point must be at least 3 characters.');
      return;
    }

    const payload: GuidePackagePayload = {
      title: this.title.trim(),
      description: this.description.trim(),
      itinerary: this.itinerary.trim() || null,
      duration_hours: Number(this.durationHours).toFixed(2),
      pricing_type: this.pricingType,
      price: Number(this.price).toFixed(2),
      currency: 'LKR',
      max_people: Number(this.maxPeople),
      included_services: this.includedServices.trim() || null,
      excluded_services: this.excludedServices.trim() || null,
      meeting_point: this.meetingPoint.trim(),
      meeting_latitude: this.useCustomCoordinates ? this.meetingLat().toFixed(6) : null,
      meeting_longitude: this.useCustomCoordinates ? this.meetingLng().toFixed(6) : null,
      is_active: this.isActive,
    };

    this.isSaving.set(true);
    const listingId = guide.listing.id;

    const request$ =
      this.editingPackageId !== null
        ? this.providerService.updateGuidePackage(listingId, this.editingPackageId, payload)
        : this.providerService.createGuidePackage(listingId, payload);

    request$.subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        if (this.editingPackageId !== null) {
          this.packages.update((curr) =>
            curr.map((p) => (p.id === saved.id ? saved : p))
          );
          this.successMessage.set('Tour package updated on server.');
        } else {
          this.packages.update((curr) => [...curr, saved]);
          this.successMessage.set('New tour package created.');
        }
        this.resetForm();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(
          this.extractErrorMessage(err, 'Could not save package changes.')
        );
      },
    });
  }

  togglePackageStatus(pkg: GuidePackageDetails): void {
    const guide = this.selectedGuide();
    if (!guide || this.isPreview()) return;
    if (guide.verification_status === 'suspended') {
      this.errorMessage.set('Suspended listings cannot modify packages.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSaving.set(true);

    this.providerService
      .updateGuidePackage(guide.listing.id, pkg.id, {
        title: pkg.title,
        description: pkg.description,
        itinerary: pkg.itinerary ?? null,
        duration_hours: pkg.duration_hours,
        pricing_type: pkg.pricing_type,
        price: pkg.price,
        currency: 'LKR',
        max_people: pkg.max_people,
        included_services: pkg.included_services ?? null,
        excluded_services: pkg.excluded_services ?? null,
        meeting_point: pkg.meeting_point,
        meeting_latitude: pkg.meeting_latitude ?? null,
        meeting_longitude: pkg.meeting_longitude ?? null,
        is_active: !pkg.is_active,
      })
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.packages.update((curr) =>
            curr.map((p) => (p.id === updated.id ? updated : p))
          );
          this.successMessage.set(
            updated.is_active ? 'Package activated.' : 'Package deactivated.'
          );
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to toggle package status.')
          );
        },
      });
  }

  async onPhotoUpload(event: Event): Promise<void> {
    const guide = this.selectedGuide();
    if (!guide || this.isPreview()) return;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    input.value = '';
    this.errorMessage.set(null);
    this.isUploadingPhoto.set(true);

    try {
      for (const file of files) {
        const media = await firstValueFrom(
          this.providerService.uploadPhoto(guide.listing.id, file, file.name)
        );
        this.gallery.update((curr) => [...curr, { media, url: null }]);
        this.fetchPhotoBlob(guide.listing.id, media.id);
      }
      this.successMessage.set('Listing photograph uploaded.');
    } catch (err: any) {
      this.errorMessage.set(this.extractErrorMessage(err, 'Failed to upload photo.'));
    } finally {
      this.isUploadingPhoto.set(false);
    }
  }

  deleteGalleryPhoto(photoId: number): void {
    const guide = this.selectedGuide();
    if (!guide || this.isPreview()) return;
    this.providerService.deletePhoto(guide.listing.id, photoId).subscribe({
      next: () => {
        const oldUrl = this.objectUrls.get(photoId);
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
          this.objectUrls.delete(photoId);
        }
        this.gallery.update((curr) => curr.filter((g) => g.media.id !== photoId));
        this.successMessage.set('Photograph deleted.');
      },
      error: (err) => {
        this.errorMessage.set(this.extractErrorMessage(err, 'Failed to delete photograph.'));
      },
    });
  }

  private hydrateGallery(guide: ReviewListing): void {
    const sorted = [...(guide.listing.media || [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    this.gallery.set(sorted.map((media) => ({ media, url: media.image_url || null })));
    if (!this.isPreview()) {
      for (const media of sorted) {
        if (!media.image_url) {
          this.fetchPhotoBlob(guide.listing.id, media.id);
        }
      }
    }
  }

  private fetchPhotoBlob(listingId: number, photoId: number): void {
    this.providerService.getPhotoBlob(listingId, photoId).subscribe({
      next: (blob) => {
        const prev = this.objectUrls.get(photoId);
        if (prev) URL.revokeObjectURL(prev);
        const url = URL.createObjectURL(blob);
        this.objectUrls.set(photoId, url);
        const safe = this.sanitizer.bypassSecurityTrustUrl(url);
        this.gallery.update((curr) =>
          curr.map((g) => (g.media.id === photoId ? { ...g, url: safe } : g))
        );
      },
      error: () => {
        // Ignore preview error
      },
    });
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: any) => d?.msg || String(d)).join('; ');
    }
    return err?.message || fallback;
  }
}
