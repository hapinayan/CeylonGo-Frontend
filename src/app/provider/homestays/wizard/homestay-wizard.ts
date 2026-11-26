import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import {
  EvidenceFileResponse,
  EvidenceLink,
  HomestayDraftState,
  HomestayRoom,
  ListingDraftUpdate,
  ListingMediaResponse,
  PropertyType,
  RoomUpdate,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { ProviderPreviewService } from '../../provider-preview.service';
import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';
import {
  ServiceVerificationComponent,
  VerificationDataState,
} from '../../../shared/components/service-verification/service-verification.component';

@Component({
  selector: 'app-homestay-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LocationPickerComponent,
    ServiceVerificationComponent,
  ],
  templateUrl: './homestay-wizard.html',
  styleUrl: './homestay-wizard.scss',
})
export class HomestayWizard implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly router = inject(Router);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;
  readonly currentStep = signal<number>(1);
  readonly listingId = signal<number | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly submitSuccess = signal<boolean>(false);
  readonly submittedListingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Step 1: Basic Info
  title = '';
  property_type: PropertyType = 'villa';
  description = '';
  contactPhone = '';
  contactEmail = '';
  houseRules = 'No smoking inside bedrooms. Quiet hours after 10 PM. Check-in with valid ID.';
  checkInTime = '14:00';
  checkOutTime = '11:00';

  // Step 2: Location
  province = 'Uva Province';
  district = 'Badulla';
  locality = 'Ella';
  streetAddress = '';
  googleMapsLink = '';
  latitude = 6.8667;
  longitude = 81.0466;

  readonly districts = [
    'Ampara',
    'Anuradhapura',
    'Badulla',
    'Batticaloa',
    'Colombo',
    'Galle',
    'Gampaha',
    'Hambantota',
    'Jaffna',
    'Kalutara',
    'Kandy',
    'Kegalle',
    'Kilinochchi',
    'Kurunegala',
    'Mannar',
    'Matale',
    'Matara',
    'Monaragala',
    'Mullaitivu',
    'Nuwara Eliya',
    'Polonnaruwa',
    'Puttalam',
    'Ratnapura',
    'Trincomalee',
    'Vavuniya',
  ];

  // Step 3: Photos & Amenities
  photos = signal<ListingMediaResponse[]>([
    {
      id: 1,
      storage_key: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      sort_order: 0,
      alt_text: 'Homestay front view',
    },
    {
      id: 2,
      storage_key: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
      sort_order: 1,
      alt_text: 'Homestay bedroom',
    },
  ]);
  coverPhotoId = signal<number | null>(1);
  isUploadingPhoto = signal<boolean>(false);
  photoUploadError = signal<string | null>(null);

  availableAmenities: string[] = [
    'Wi-Fi',
    'Air Conditioning',
    'Hot Water',
    'Breakfast Included',
    'Swimming Pool',
    'Mountain View',
    'Beach Access',
    'Kitchen / Cooking Facilities',
    'Free Parking',
    'Balcony / Terrace',
    'Dedicated Workspace',
    'Garden & BBQ Area',
  ];
  selectedAmenities: string[] = [
    'Wi-Fi',
    'Hot Water',
    'Breakfast Included',
    'Mountain View',
  ];

  // Step 4: Rooms & Pricing
  rooms = signal<RoomUpdate[]>([
    {
      label: 'Deluxe Mountain View Room',
      room_type: 'Double Bed',
      capacity: 2,
      nightly_price: '6500.00',
      description: 'Private balcony overlooking tea plantations',
      photo_ids: [],
    },
  ]);
  newRoomLabel = '';
  newRoomType = 'Queen Bed';
  newRoomCapacity = 2;
  newRoomPrice = '6500.00';

  // Step 5: Verification Evidence
  verificationData: VerificationDataState = {
    evidence: {
      links: [
        { kind: 'maps', url: 'https://maps.google.com/' },
        { kind: 'airbnb', url: 'https://airbnb.com/rooms/sample' },
      ],
      notes: 'Newly opened property with verified local ownership.',
    },
    files: [],
  };

  // Step 6: Review & Declaration
  declarationAgreed = false;

  // Draft recovery alert
  hasDraft = signal<boolean>(false);

  ngOnInit(): void {
    if (this.isPreview()) {
      const sample = this.previewService.sampleListings.find(
        (item) => item.listing.category === 'homestay'
      );
      if (sample) {
        this.listingId.set(sample.listing.id);
        this.title = sample.listing.title;
        this.description = sample.listing.description;
        this.province = String(sample.details?.['province'] || 'Uva');
        this.district = sample.listing.district || 'Badulla';
        this.locality = sample.listing.locality || 'Ella';
        this.streetAddress = String(sample.details?.['address'] || '');
        if (sample.listing.media?.length) {
          this.photos.set(sample.listing.media);
          this.coverPhotoId.set(sample.listing.media[0].id);
        }
        if (sample.rooms?.length) {
          this.rooms.set(
            sample.rooms.map((r) => ({
              label: r.label,
              capacity: r.capacity,
              nightly_price: r.nightly_price || '9500.00',
              room_type: r.room_type,
              description: r.description,
              photo_ids: r.photo_ids,
            }))
          );
        }
        if (sample.homestay_metadata?.amenities) {
          this.selectedAmenities = [...sample.homestay_metadata.amenities];
        }
      } else {
        this.listingId.set(9001);
        this.title = 'Sample: Ella Misty Hills Villa';
        this.description = 'Sample preview homestay listing.';
      }
      return;
    }

    const draft = this.providerService.getDraft();
    if (draft && draft.basicInfo?.title) {
      this.hasDraft.set(true);
    } else {
      this.initBackendDraft();
    }
  }

  private initBackendDraft(): void {
    if (this.listingId()) return;

    this.providerService.createDraftListing('homestay').subscribe({
      next: (review) => {
        if (review?.listing?.id) {
          this.listingId.set(review.listing.id);
        }
      },
      error: () => {
        // Fallback for offline tests
        this.listingId.set(101);
      },
    });
  }

  loadDraft(): void {
    const draft = this.providerService.getDraft();
    if (!draft) return;

    this.listingId.set(draft.listingId || 101);
    this.currentStep.set(draft.step || 1);
    this.title = draft.basicInfo.title;
    this.property_type = draft.basicInfo.property_type;
    this.description = draft.basicInfo.description;
    this.contactPhone = draft.basicInfo.contact;
    this.houseRules = draft.basicInfo.house_rules;
    this.checkInTime = draft.basicInfo.check_in_time;
    this.checkOutTime = draft.basicInfo.check_out_time;

    this.province = draft.location.province;
    this.district = draft.location.district;
    this.locality = draft.location.locality;
    this.streetAddress = draft.location.address;
    this.latitude = draft.location.latitude;
    this.longitude = draft.location.longitude;

    if (draft.photos?.length) {
      this.photos.set([...draft.photos]);
      this.coverPhotoId.set(draft.photos[0].id);
    }

    if (draft.amenities?.length) {
      this.selectedAmenities = [...draft.amenities];
    }

    if (draft.rooms?.length) {
      this.rooms.set([...draft.rooms]);
    }

    if (draft.evidence) {
      this.verificationData = {
        evidence: draft.evidence,
        files: draft.evidence.files || [],
      };
    }

    this.hasDraft.set(false);
  }

  discardDraft(): void {
    this.providerService.clearDraft();
    this.hasDraft.set(false);
    this.initBackendDraft();
  }

  saveCurrentDraft(): void {
    const draftState: HomestayDraftState = {
      listingId: this.listingId(),
      step: this.currentStep(),
      basicInfo: {
        title: this.title,
        property_type: this.property_type,
        description: this.description,
        contact: this.contactPhone || this.contactEmail,
        house_rules: this.houseRules,
        check_in_time: this.checkInTime,
        check_out_time: this.checkOutTime,
      },
      location: {
        province: this.province,
        district: this.district,
        locality: this.locality,
        address: this.streetAddress,
        latitude: this.latitude,
        longitude: this.longitude,
      },
      photos: this.photos(),
      amenities: this.selectedAmenities,
      rooms: this.rooms(),
      evidence: {
        links: this.verificationData.evidence.links,
        notes: this.verificationData.evidence.notes,
        files: this.verificationData.files,
      },
      lastSavedAt: new Date().toISOString(),
    };

    this.providerService.saveDraft(draftState);

    // Sync with backend draft PATCH if listingId exists
    const id = this.listingId();
    if (id) {
      const updatePayload: ListingDraftUpdate = {
        title: this.title,
        description: this.description,
        province: this.province,
        district: this.district,
        locality: this.locality,
        address: this.streetAddress,
        latitude: this.latitude,
        longitude: this.longitude,
        price: this.rooms().length > 0 ? Number(this.rooms()[0].nightly_price) : 6500,
        house_rules: this.houseRules,
        check_in_time: this.checkInTime.length === 5 ? `${this.checkInTime}:00` : this.checkInTime,
        check_out_time:
          this.checkOutTime.length === 5 ? `${this.checkOutTime}:00` : this.checkOutTime,
        contact: this.contactPhone || this.contactEmail,
        metadata: {
          property_type: this.property_type,
          amenities: this.selectedAmenities,
        },
      };

      this.providerService.updateListingDraft(id, updatePayload).subscribe();
    }
  }

  goToStep(step: number): void {
    if (step < 1 || step > 6) return;
    this.saveCurrentDraft();
    this.currentStep.set(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextStep(): void {
    if (this.currentStep() < 6) {
      this.goToStep(this.currentStep() + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.goToStep(this.currentStep() - 1);
    }
  }

  // Location handler
  onCoordinatesChange(coords: { lat: number; lng: number }): void {
    this.latitude = coords.lat;
    this.longitude = coords.lng;
    this.saveCurrentDraft();
  }

  // Amenities handlers
  toggleAmenity(amenity: string): void {
    if (this.selectedAmenities.includes(amenity)) {
      this.selectedAmenities = this.selectedAmenities.filter((a) => a !== amenity);
    } else {
      this.selectedAmenities.push(amenity);
    }
    this.saveCurrentDraft();
  }

  // Photo handlers: Real multipart upload
  onPhotoFileSelected(event: Event): void {
    if (this.isPreview()) {
      this.photoUploadError.set('Photo uploads are disabled in Preview Mode.');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.photoUploadError.set(null);

    // Limit: 5 MB for JPEG, PNG, WebP
    if (file.size > 5 * 1024 * 1024) {
      this.photoUploadError.set('Photo exceeds 5 MB limit.');
      input.value = '';
      return;
    }

    const id = this.listingId();
    this.isUploadingPhoto.set(true);

    if (id) {
      this.providerService.uploadPhoto(id, file, `${this.title || 'Property'} photo`).subscribe({
        next: (uploaded) => {
          this.photos.update((list) => [...list, uploaded]);
          if (!this.coverPhotoId()) {
            this.coverPhotoId.set(uploaded.id);
          }
          this.isUploadingPhoto.set(false);
          input.value = '';
          this.saveCurrentDraft();
        },
        error: (err) => {
          this.photoUploadError.set(err.message || 'Photo upload failed.');
          this.isUploadingPhoto.set(false);
          input.value = '';
        },
      });
    } else {
      // Local fallback
      const mockPhoto: ListingMediaResponse = {
        id: Date.now(),
        storage_key: URL.createObjectURL(file),
        sort_order: this.photos().length,
        alt_text: file.name,
      };
      this.photos.update((list) => [...list, mockPhoto]);
      this.isUploadingPhoto.set(false);
      input.value = '';
      this.saveCurrentDraft();
    }
  }

  setAsCover(photoId: number): void {
    if (this.isPreview()) return;
    this.coverPhotoId.set(photoId);
    const id = this.listingId();
    if (id) {
      this.providerService.setCoverPhoto(id, photoId).subscribe();
    }
    this.saveCurrentDraft();
  }

  removePhoto(photoId: number): void {
    if (this.isPreview()) return;
    const id = this.listingId();
    if (id) {
      this.providerService.deletePhoto(id, photoId).subscribe();
    }
    this.photos.update((list) => list.filter((p) => p.id !== photoId));
    if (this.coverPhotoId() === photoId && this.photos().length > 0) {
      this.coverPhotoId.set(this.photos()[0].id);
    }
    this.saveCurrentDraft();
  }

  // Room handlers
  addRoom(): void {
    if (this.isPreview() || !this.newRoomLabel.trim()) return;

    const newRoom: RoomUpdate = {
      label: this.newRoomLabel.trim(),
      room_type: this.newRoomType,
      capacity: Number(this.newRoomCapacity) || 1,
      nightly_price: Number(this.newRoomPrice).toFixed(2),
      description: `${this.newRoomType} with standard amenities`,
      photo_ids: this.coverPhotoId() ? [this.coverPhotoId()!] : [],
    };

    const id = this.listingId();
    if (id) {
      this.providerService.addRoom(id, newRoom).subscribe({
        next: (created) => {
          this.rooms.update((list) => [...list, newRoom]);
          this.newRoomLabel = '';
          this.saveCurrentDraft();
        },
        error: () => {
          this.rooms.update((list) => [...list, newRoom]);
          this.newRoomLabel = '';
          this.saveCurrentDraft();
        },
      });
    } else {
      this.rooms.update((list) => [...list, newRoom]);
      this.newRoomLabel = '';
      this.saveCurrentDraft();
    }
  }

  removeRoom(index: number): void {
    if (this.rooms().length > 1) {
      this.rooms.update((list) => list.filter((_, i) => i !== index));
      this.saveCurrentDraft();
    }
  }

  // Verification payload handler
  onVerificationChange(data: VerificationDataState): void {
    this.verificationData = data;
    if (this.isPreview()) return;
    const id = this.listingId();
    if (id) {
      this.providerService.saveEvidence(id, data.evidence).subscribe();
    }
    this.saveCurrentDraft();
  }

  // Final Submission to Real Backend using POST /submit
  submitListing(): void {
    if (this.isPreview()) {
      this.errorMessage.set('Listing submission is disabled in Preview Mode.');
      return;
    }
    if (!this.declarationAgreed) {
      this.errorMessage.set('Please agree to the host verification declaration before submitting.');
      return;
    }

    if (!this.title.trim()) {
      this.errorMessage.set('Property title is required in Step 1.');
      return;
    }

    if (this.photos().length === 0) {
      this.errorMessage.set('At least 1 photo is required in Step 3.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const id = this.listingId() || 101;

    // Save final draft update first
    const updatePayload: ListingDraftUpdate = {
      title: this.title.trim(),
      description: this.description.trim(),
      province: this.province,
      district: this.district,
      locality: this.locality.trim(),
      address: this.streetAddress.trim(),
      latitude: this.latitude,
      longitude: this.longitude,
      price: this.rooms().length > 0 ? Number(this.rooms()[0].nightly_price) : 6500,
      house_rules: this.houseRules,
      check_in_time: this.checkInTime.length === 5 ? `${this.checkInTime}:00` : this.checkInTime,
      check_out_time:
        this.checkOutTime.length === 5 ? `${this.checkOutTime}:00` : this.checkOutTime,
      contact: this.contactPhone || this.contactEmail,
      metadata: {
        property_type: this.property_type,
        amenities: this.selectedAmenities,
      },
    };

    this.providerService.updateListingDraft(id, updatePayload).subscribe({
      next: () => {
        // Now call the exact POST /submit endpoint
        this.providerService.submitListing(id).subscribe({
          next: (review) => {
            this.submittedListingId.set(review?.listing?.id || id);
            this.providerService.clearDraft();
            this.isSubmitting.set(false);
            this.submitSuccess.set(true);
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.errorMessage.set(
              err.message || 'Submission failed. Please check required verification documents.'
            );
          },
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message || 'Failed to update listing draft before submission.');
      },
    });
  }
}
