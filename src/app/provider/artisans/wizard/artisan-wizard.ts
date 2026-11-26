import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import {
  ArtisanBusinessPayload,
  ArtisanProductDetails,
  ArtisanProductImage,
  ArtisanProductInput,
  EvidenceFileResponse,
  EvidenceLink,
  ListingDraftUpdate,
  ListingMediaResponse,
  ReviewListing,
  VerificationStatus,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { CANONICAL_ARTISAN_CATEGORIES } from '../../../features/artisan/services/artisan.service';
import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';
import {
  ServiceVerificationComponent,
  VerificationDataState,
} from '../../../shared/components/service-verification/service-verification.component';
import { ProviderPreviewService } from '../../provider-preview.service';

interface PhotoPreview {
  media: ListingMediaResponse;
  url: SafeUrl | string | null;
}

export interface ArtisanShowcaseDraftImage {
  id: number;
  image_url: string;
  previewUrl?: SafeUrl | string | null;
  caption?: string | null;
}

export interface ArtisanShowcaseDraftItem {
  id?: number;
  name: string;
  category: string;
  description: string;
  materials: string;
  price: number | null;
  is_active: boolean;
  images?: ArtisanShowcaseDraftImage[];
}

@Component({
  selector: 'app-artisan-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LocationPickerComponent,
    ServiceVerificationComponent,
  ],
  templateUrl: './artisan-wizard.html',
  styleUrl: './artisan-wizard.scss',
})
export class ArtisanWizard implements OnInit, OnDestroy {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly steps = [
    { num: 1, label: 'Business Info' },
    { num: 2, label: 'Location & Contact' },
    { num: 3, label: 'Photos & Media' },
    { num: 4, label: 'Products Showcase' },
    { num: 5, label: 'Verification' },
    { num: 6, label: 'Review & Submit' },
  ];

  readonly craftCategories = [...CANONICAL_ARTISAN_CATEGORIES];
  readonly businessTypes = [
    'Artisan Workshop',
    'Handicraft Studio',
    'Small Local Business',
    'Pottery & Ceramic Studio',
    'Batik & Handloom Studio',
    'Spice & Herbal Producer',
  ];

  readonly provinces = [
    'Western',
    'Central',
    'Southern',
    'Northern',
    'Eastern',
    'North Western',
    'North Central',
    'Uva',
    'Sabaragamuwa',
  ];

  readonly districtsMap: Record<string, string[]> = {
    Western: ['Colombo', 'Gampaha', 'Kalutara'],
    Central: ['Kandy', 'Matale', 'Nuwara Eliya'],
    Southern: ['Galle', 'Matara', 'Hambantota'],
    Northern: ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'],
    Eastern: ['Trincomalee', 'Batticaloa', 'Ampara'],
    'North Western': ['Kurunegala', 'Puttalam'],
    'North Central': ['Anuradhapura', 'Polonnaruwa'],
    Uva: ['Badulla', 'Monaragala'],
    Sabaragamuwa: ['Ratnapura', 'Kegalle'],
  };

  readonly currentStep = signal<number>(1);
  readonly listingId = signal<number | null>(null);
  readonly isEditMode = signal<boolean>(false);
  readonly verificationStatus = signal<VerificationStatus>('draft');
  readonly isSaving = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isUploadingPhoto = signal<boolean>(false);
  readonly errorBanner = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly submittedSuccess = signal<boolean>(false);

  // Step 1 — Business Info
  title = '';
  craftCategory = 'Handicrafts';
  businessType = 'Artisan Workshop';
  description = '';
  ownerBackground = '';
  businessHistory = '';
  startingPrice = 1500;

  // Step 2 — Location & Contact
  province = 'Central';
  district = 'Kandy';
  locality = '';
  address = '';
  latitude: number | null = 7.2906;
  longitude: number | null = 80.6337;
  phone = '';
  whatsapp = '';
  email = '';
  website = '';
  socialFacebook = '';
  socialInstagram = '';
  openingHours = 'Mon - Sat, 09:00 AM - 05:30 PM';

  // Step 3 — Photos
  readonly photos = signal<PhotoPreview[]>([]);
  private readonly blobUrls = new Map<number, string>();
  private readonly productBlobUrls = new Map<string, string>();

  // Step 4 — Products Showcase (backed by /provider/listings/{id}/products)
  readonly showcaseItems = signal<ArtisanShowcaseDraftItem[]>([]);
  readonly isUploadingProductPhoto = signal<boolean>(false);
  newProductName = '';
  newProductCategory = 'Handicrafts';
  newProductDescription = '';
  newProductMaterials = '';
  newProductPrice: number | null = null;
  editingProductIndex: number | null = null;

  // Step 5 — Verification
  readonly initialVerificationData = signal<Partial<VerificationDataState> | undefined>(undefined);
  verificationLinks: EvidenceLink[] = [];
  verificationNotes = '';
  uploadedEvidenceFiles: EvidenceFileResponse[] = [];

  readonly availableDistricts = computed(() => {
    return this.districtsMap[this.province] ?? [];
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const preview = this.route.snapshot.queryParamMap.get('preview');
    this.previewService.syncFromNavigation(this.router.url, preview ?? undefined);

    if (idParam && Number.isFinite(Number(idParam))) {
      this.isEditMode.set(true);
      this.loadExistingListing(Number(idParam));
    } else if (this.isPreview()) {
      const sample = this.previewService.sampleListings.find((l) => l.listing.category === 'artisan');
      if (sample) {
        this.applyListingData(sample);
      }
    }
  }

  ngOnDestroy(): void {
    for (const url of this.blobUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.blobUrls.clear();
    for (const url of this.productBlobUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.productBlobUrls.clear();
  }

  onProvinceChange(): void {
    const list = this.districtsMap[this.province] ?? [];
    if (list.length > 0 && !list.includes(this.district)) {
      this.district = list[0];
    }
  }

  onCoordinatesChanged(coords: { lat: number; lng: number }): void {
    this.latitude = coords.lat;
    this.longitude = coords.lng;
  }

  goToStep(stepNum: number): void {
    if (stepNum < 1 || stepNum > this.steps.length) return;
    if (stepNum > this.currentStep() && !this.validateCurrentStep()) return;
    this.errorBanner.set(null);
    this.currentStep.set(stepNum);
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) return;
    if (this.currentStep() < this.steps.length) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.errorBanner.set(null);
      this.currentStep.update((s) => s - 1);
    }
  }

  private validateCurrentStep(): boolean {
    const step = this.currentStep();
    if (step === 1) {
      if (!this.title.trim() || this.title.trim().length < 3) {
        this.errorBanner.set('Please enter a valid Artisan business name (at least 3 characters).');
        return false;
      }
      if (!this.description.trim() || this.description.trim().length < 15) {
        this.errorBanner.set('Please enter a detailed business description (at least 15 characters).');
        return false;
      }
    }
    if (step === 2) {
      if (!this.district || !this.locality.trim()) {
        this.errorBanner.set('Please provide your business district and city/locality.');
        return false;
      }
    }
    this.errorBanner.set(null);
    return true;
  }

  async saveDraft(): Promise<ReviewListing | null> {
    if (this.isPreview()) {
      this.successMessage.set('Preview Mode: draft changes remain in browser memory only.');
      setTimeout(() => this.successMessage.set(null), 3000);
      return null;
    }

    this.errorBanner.set(null);
    this.isSaving.set(true);

    try {
      let id = this.listingId();
      if (!id) {
        const created = await firstValueFrom(this.providerService.createDraftListing('artisan'));
        id = created.listing.id;
        this.listingId.set(id);
        this.verificationStatus.set(created.verification_status);
      }

      const cleanDesc = this.description.trim();
      const contactSummary = [this.phone.trim(), this.email.trim(), this.website.trim()]
        .filter(Boolean)
        .join(' | ');

      const socialLinks: Record<string, string> = {};
      if (this.socialFacebook.trim()) socialLinks['facebook'] = this.socialFacebook.trim();
      if (this.socialInstagram.trim()) socialLinks['instagram'] = this.socialInstagram.trim();

      const artisanMeta: ArtisanBusinessPayload = {
        craft_category: this.craftCategory || null,
        business_type: this.businessType || null,
        business_background: this.businessHistory.trim() || null,
        artisan_information: this.ownerBackground.trim() || null,
        phone: this.phone.trim() || null,
        whatsapp_number: this.normalizeWhatsappNumber(this.whatsapp),
        email: this.email.trim() || null,
        website_url: this.website.trim() || null,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        opening_hours: this.openingHours.trim() || null,
      };

      const draftPayload: ListingDraftUpdate = {
        category: 'artisan',
        title: this.title.trim() || 'Untitled Artisan Workshop',
        description: cleanDesc || undefined,
        province: this.province,
        district: this.district,
        locality: this.locality.trim() || this.district,
        address: this.address.trim() || undefined,
        latitude: this.latitude ?? undefined,
        longitude: this.longitude ?? undefined,
        price: Math.max(0, Number(this.startingPrice) || 0),
        contact: contactSummary || undefined,
        artisan: artisanMeta,
      };

      const updated = await firstValueFrom(this.providerService.updateListingDraft(id, draftPayload));
      this.verificationStatus.set(updated.verification_status);

      if (this.verificationLinks.length > 0 || this.verificationNotes.trim()) {
        await firstValueFrom(
          this.providerService.saveEvidence(id, {
            links: this.verificationLinks,
            notes: this.verificationNotes.trim(),
          }),
        );
      }

      this.successMessage.set('Draft saved to backend.');
      setTimeout(() => this.successMessage.set(null), 3000);
      return updated;
    } catch (err: any) {
      this.errorBanner.set(this.extractError(err, 'Could not save Artisan draft.'));
      return null;
    } finally {
      this.isSaving.set(false);
    }
  }

  async onPhotoSelected(event: Event): Promise<void> {
    if (this.isPreview()) {
      this.errorBanner.set('Photo uploads are disabled in Preview Mode.');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.errorBanner.set('Only JPEG, PNG, or WebP images are supported.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorBanner.set('Photo file size must not exceed 5 MB.');
      input.value = '';
      return;
    }

    this.errorBanner.set(null);
    this.isUploadingPhoto.set(true);

    try {
      let id = this.listingId();
      if (!id) {
        const saved = await this.saveDraft();
        id = saved?.listing.id ?? this.listingId();
      }
      if (!id) {
        this.errorBanner.set('Save basic details first before uploading photos.');
        return;
      }

      const uploaded = await firstValueFrom(
        this.providerService.uploadPhoto(id, file, this.title || 'Artisan workshop photo'),
      );
      this.photos.update((curr) => [...curr, { media: uploaded, url: uploaded.image_url || null }]);
      this.loadPhotoBlobPreview(id, uploaded);
    } catch (err: any) {
      this.errorBanner.set(this.extractError(err, 'Photo upload failed.'));
    } finally {
      this.isUploadingPhoto.set(false);
      input.value = '';
    }
  }

  async setCover(photoId: number): Promise<void> {
    if (this.isPreview() || !this.listingId()) return;
    try {
      const updated = await firstValueFrom(this.providerService.setCoverPhoto(this.listingId()!, photoId));
      this.refreshPhotos(updated.listing.media ?? []);
      this.successMessage.set('Cover photo updated.');
      setTimeout(() => this.successMessage.set(null), 2500);
    } catch (err: any) {
      this.errorBanner.set(this.extractError(err, 'Could not update cover photo.'));
    }
  }

  async removePhoto(photoId: number): Promise<void> {
    if (this.isPreview() || !this.listingId()) return;
    try {
      await firstValueFrom(this.providerService.deletePhoto(this.listingId()!, photoId));
      this.photos.update((curr) => curr.filter((p) => p.media.id !== photoId));
    } catch (err: any) {
      this.errorBanner.set(this.extractError(err, 'Could not delete photo.'));
    }
  }

  async addOrSaveProduct(): Promise<void> {
    const cleanName = this.newProductName.trim();
    if (!cleanName) {
      this.errorBanner.set('Enter a product or handicraft name.');
      return;
    }
    this.errorBanner.set(null);

    const cleanDescription = this.newProductDescription.trim() || `${cleanName} crafted by ${this.title.trim() || 'our workshop'}.`;
    const draftItem: ArtisanShowcaseDraftItem = {
      name: cleanName,
      category: this.newProductCategory || this.craftCategory,
      description: cleanDescription,
      materials: this.newProductMaterials.trim(),
      price: this.newProductPrice != null && Number(this.newProductPrice) >= 0 ? Number(this.newProductPrice) : null,
      is_active: true,
    };

    const existingItem =
      this.editingProductIndex != null ? this.showcaseItems()[this.editingProductIndex] : undefined;
    const existingId = existingItem?.id;

    if (!this.isPreview()) {
      let id = this.listingId();
      if (!id) {
        const saved = await this.saveDraft();
        id = saved?.listing.id ?? this.listingId();
      }
      if (!id) {
        this.errorBanner.set('Save basic details before adding showcase products.');
        return;
      }

      const payload: ArtisanProductInput = {
        title: draftItem.name,
        category: draftItem.category,
        description: draftItem.description,
        materials: draftItem.materials || null,
        price: draftItem.price,
        is_active: existingItem ? existingItem.is_active : true,
      };

      try {
        if (existingId) {
          const updated = await firstValueFrom(
            this.providerService.updateArtisanProduct(id, existingId, payload),
          );
          draftItem.id = updated.id;
          draftItem.is_active = updated.is_available !== false;
          draftItem.images = existingItem?.images ?? [];
        } else {
          const created = await firstValueFrom(
            this.providerService.createArtisanProduct(id, payload),
          );
          draftItem.id = created.id;
          draftItem.is_active = created.is_available !== false;
          draftItem.images = [];
        }
      } catch (err: any) {
        this.errorBanner.set(this.extractError(err, 'Could not sync showcase product with backend.'));
        return;
      }
    }

    if (this.editingProductIndex != null) {
      const idx = this.editingProductIndex;
      this.showcaseItems.update((items) => items.map((item, i) => (i === idx ? draftItem : item)));
      this.editingProductIndex = null;
    } else {
      this.showcaseItems.update((items) => [...items, draftItem]);
    }

    this.newProductName = '';
    this.newProductDescription = '';
    this.newProductMaterials = '';
    this.newProductPrice = null;
  }

  editProduct(index: number): void {
    const item = this.showcaseItems()[index];
    if (!item) return;
    this.editingProductIndex = index;
    this.newProductName = item.name;
    this.newProductCategory = item.category;
    this.newProductDescription = item.description;
    this.newProductMaterials = item.materials;
    this.newProductPrice = item.price;
  }

  async toggleProductActive(index: number): Promise<void> {
    const item = this.showcaseItems()[index];
    if (!item) return;
    const nextActive = !item.is_active;

    if (!this.isPreview() && this.listingId() && item.id) {
      try {
        await firstValueFrom(
          this.providerService.updateArtisanProduct(this.listingId()!, item.id, {
            title: item.name,
            category: item.category || this.craftCategory,
            description: item.description || item.name,
            materials: item.materials || null,
            price: item.price,
            is_active: nextActive,
          }),
        );
      } catch (err: any) {
        this.errorBanner.set(this.extractError(err, 'Could not update product status.'));
        return;
      }
    }

    this.showcaseItems.update((items) =>
      items.map((p, i) => (i === index ? { ...p, is_active: nextActive } : p)),
    );
  }

  async removeUnsavedProduct(index: number): Promise<void> {
    const item = this.showcaseItems()[index];
    if (!item) return;
    if (item.id && !this.isPreview() && this.listingId()) {
      try {
        await firstValueFrom(this.providerService.deleteArtisanProduct(this.listingId()!, item.id));
        this.showcaseItems.update((items) =>
          items.map((p, i) => (i === index ? { ...p, is_active: false } : p)),
        );
      } catch (err: any) {
        this.errorBanner.set(this.extractError(err, 'Could not remove showcase product.'));
      }
      return;
    }
    this.showcaseItems.update((items) => items.filter((_, i) => i !== index));
  }

  async onProductPhotoSelected(index: number, event: Event): Promise<void> {
    if (this.isPreview()) {
      this.errorBanner.set('Product photo uploads are disabled in Preview Mode.');
      return;
    }
    const item = this.showcaseItems()[index];
    const listingId = this.listingId();
    const input = event.target as HTMLInputElement;
    if (!item?.id || !listingId || !input.files?.length) return;
    const file = input.files[0];

    this.errorBanner.set(null);
    this.isUploadingProductPhoto.set(true);
    try {
      const uploaded = await firstValueFrom(
        this.providerService.uploadArtisanProductPhoto(listingId, item.id, file, item.name),
      );
      const nextImg: ArtisanShowcaseDraftImage = {
        id: uploaded.id,
        image_url: uploaded.image_url,
        caption: uploaded.caption,
      };
      this.showcaseItems.update((list) =>
        list.map((p, i) => (i === index ? { ...p, images: [...(p.images ?? []), nextImg] } : p)),
      );
      this.loadProductPhotoPreview(listingId, item.id, uploaded);
    } catch (err: any) {
      this.errorBanner.set(this.extractError(err, 'Product photo upload failed.'));
    } finally {
      this.isUploadingProductPhoto.set(false);
      input.value = '';
    }
  }

  async removeProductPhoto(index: number, photoId: number): Promise<void> {
    const item = this.showcaseItems()[index];
    const listingId = this.listingId();
    if (this.isPreview() || !listingId || !item?.id) return;
    try {
      await firstValueFrom(this.providerService.deleteArtisanProductPhoto(listingId, item.id, photoId));
      this.showcaseItems.update((list) =>
        list.map((p, i) =>
          i === index ? { ...p, images: (p.images ?? []).filter((img) => img.id !== photoId) } : p,
        ),
      );
    } catch (err: any) {
      this.errorBanner.set(this.extractError(err, 'Could not delete product photo.'));
    }
  }

  onVerificationChange(state: VerificationDataState): void {
    this.verificationLinks = [...state.evidence.links];
    this.verificationNotes = state.evidence.notes;
    this.uploadedEvidenceFiles = [...state.files];
  }

  submitListing(): void {
    if (this.isPreview()) {
      this.errorBanner.set('Submitting listings for verification is disabled in Preview Mode.');
      return;
    }
    if (!this.validateCurrentStep()) return;

    this.isSubmitting.set(true);
    this.errorBanner.set(null);

    void this.saveDraft().then((saved) => {
      const id = saved?.listing.id ?? this.listingId();
      if (!id) {
        this.isSubmitting.set(false);
        return;
      }

      this.providerService
        .submitListing(id)
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (updated) => {
            this.verificationStatus.set(updated.verification_status);
            this.submittedSuccess.set(true);
          },
          error: (err) => {
            this.errorBanner.set(this.extractError(err, 'Could not submit listing for verification.'));
          },
        });
    });
  }

  private loadExistingListing(id: number): void {
    this.providerService.getProviderListing(id).subscribe({
      next: (review) => {
        if (review) {
          this.applyListingData(review);
        } else {
          this.errorBanner.set('Artisan draft listing was not found.');
        }
      },
      error: (err) => {
        this.errorBanner.set(this.extractError(err, 'Failed to load Artisan draft listing.'));
      },
    });
  }

  private applyListingData(review: ReviewListing): void {
    const l = review.listing;
    this.listingId.set(l.id);
    this.verificationStatus.set(review.verification_status);
    this.title = l.title || '';
    this.description = l.description || '';
    this.province = String(review.details?.['province'] || this.province);
    this.district = l.district || this.district;
    this.locality = l.locality || '';
    this.address = String(review.details?.['address'] || '');
    this.latitude = l.latitude != null ? Number(l.latitude) : this.latitude;
    this.longitude = l.longitude != null ? Number(l.longitude) : this.longitude;
    this.startingPrice = l.price != null ? Number(l.price) : 0;

    const artisanMeta = (review.details?.['artisan'] ?? review.details ?? {}) as Record<string, any>;
    if (artisanMeta['craft_category']) this.craftCategory = String(artisanMeta['craft_category']);
    if (artisanMeta['business_type']) this.businessType = String(artisanMeta['business_type']);
    if (artisanMeta['business_background']) this.businessHistory = String(artisanMeta['business_background']);
    if (artisanMeta['artisan_information']) this.ownerBackground = String(artisanMeta['artisan_information']);
    if (artisanMeta['phone']) this.phone = String(artisanMeta['phone']);
    if (artisanMeta['whatsapp_number']) this.whatsapp = String(artisanMeta['whatsapp_number']);
    if (artisanMeta['email']) this.email = String(artisanMeta['email']);
    if (artisanMeta['website_url']) this.website = String(artisanMeta['website_url']);
    if (artisanMeta['opening_hours']) this.openingHours = String(artisanMeta['opening_hours']);
    if (artisanMeta['social_links'] && typeof artisanMeta['social_links'] === 'object') {
      const links = artisanMeta['social_links'] as Record<string, any>;
      if (links['facebook']) this.socialFacebook = String(links['facebook']);
      if (links['instagram']) this.socialInstagram = String(links['instagram']);
    }

    if (review.details?.['links'] || review.details?.['notes'] || review.details?.['files']) {
      this.initialVerificationData.set({
        evidence: {
          links: Array.isArray(review.details['links']) ? review.details['links'] : [],
          notes: String(review.details['notes'] || ''),
        },
        files: Array.isArray(review.details['files']) ? review.details['files'] : [],
      });
    }

    this.refreshPhotos(l.media ?? []);

    const embeddedProducts = Array.isArray(review.details?.['products'])
      ? (review.details['products'] as ArtisanProductDetails[])
      : [];

    if (embeddedProducts.length > 0) {
      this.hydrateProducts(l.id, embeddedProducts);
    } else if (!this.isPreview() && this.providerService.getArtisanProducts) {
      this.providerService.getArtisanProducts(l.id, 1, 50).subscribe({
        next: (page) => {
          if (Array.isArray(page?.items) && page.items.length > 0) {
            this.hydrateProducts(l.id, page.items);
          } else {
            this.hydrateFallbackUnits(l.units ?? []);
          }
        },
        error: () => this.hydrateFallbackUnits(l.units ?? []),
      });
    } else {
      this.hydrateFallbackUnits(l.units ?? []);
    }
  }

  private hydrateProducts(listingId: number, products: ArtisanProductDetails[]): void {
    this.showcaseItems.set(
      products.map((p) => ({
        id: p.id,
        name: p.title,
        category: p.category || this.craftCategory,
        description: p.description || '',
        materials: p.materials || '',
        price: p.price != null ? Number(p.price) : null,
        is_active: p.is_active !== false && p.is_available !== false,
        images: (p.images ?? p.product_images ?? []).map((img) => ({
          id: img.id,
          image_url: img.image_url,
          previewUrl: null,
          caption: img.caption,
        })),
      })),
    );
    if (!this.isPreview()) {
      for (const p of products) {
        for (const img of p.images ?? p.product_images ?? []) {
          this.loadProductPhotoPreview(listingId, p.id, img);
        }
      }
    }
  }

  private hydrateFallbackUnits(units: any[]): void {
    const list = Array.isArray(units) ? units : [];
    this.showcaseItems.set(
      list.map((u) => ({
        id: u.id,
        name: u.label,
        category: this.craftCategory,
        description: '',
        materials: '',
        price: null,
        is_active: u.is_active !== false,
        images: [],
      })),
    );
  }

  private loadProductPhotoPreview(listingId: number, productId: number, img: ArtisanProductImage): void {
    this.providerService.getArtisanProductPhotoBlob?.(listingId, productId, img.id)?.subscribe({
      next: (blob) => {
        const key = `${productId}:${img.id}`;
        const prev = this.productBlobUrls.get(key);
        if (prev) URL.revokeObjectURL(prev);
        const objUrl = URL.createObjectURL(blob);
        this.productBlobUrls.set(key, objUrl);
        const safe = this.sanitizer.bypassSecurityTrustUrl(objUrl);
        this.showcaseItems.update((items) =>
          items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  images: (item.images ?? []).map((i) =>
                    i.id === img.id ? { ...i, previewUrl: safe } : i,
                  ),
                }
              : item,
          ),
        );
      },
      error: () => {},
    });
  }

  private refreshPhotos(mediaList: ListingMediaResponse[]): void {
    this.photos.set(
      mediaList.map((media) => ({
        media,
        url: media.image_url || null,
      })),
    );
    const id = this.listingId();
    if (!id || this.isPreview()) return;
    for (const m of mediaList) {
      if (!m.image_url) {
        this.loadPhotoBlobPreview(id, m);
      }
    }
  }

  private loadPhotoBlobPreview(listingId: number, media: ListingMediaResponse): void {
    this.providerService.getPhotoBlob(listingId, media.id).subscribe({
      next: (blob) => {
        const prev = this.blobUrls.get(media.id);
        if (prev) URL.revokeObjectURL(prev);
        const objUrl = URL.createObjectURL(blob);
        this.blobUrls.set(media.id, objUrl);
        const safe = this.sanitizer.bypassSecurityTrustUrl(objUrl);
        this.photos.update((curr) => curr.map((p) => (p.media.id === media.id ? { ...p, url: safe } : p)));
      },
      error: () => {},
    });
  }

  private normalizeWhatsappNumber(raw: string): string | null {
    const cleaned = raw.replace(/[\s()-]/g, '').trim();
    if (!cleaned) return null;
    if (cleaned.startsWith('0') && cleaned.length >= 9) {
      return '+94' + cleaned.slice(1);
    }
    return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  }

  private extractError(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    return err?.message || fallback;
  }
}
