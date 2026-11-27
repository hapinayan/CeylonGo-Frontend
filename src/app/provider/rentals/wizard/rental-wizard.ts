import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import {
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  EvidenceFileResponse,
  EvidenceLink,
  ListingCategory,
  ListingDraftUpdate,
  ListingMediaResponse,
  RentalMetadataPayload,
  RentalSubtype,
  RentalTransmission,
  RentalUnitResponse,
  ReviewListing,
  VerificationStatus,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
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

type UiVehicleKind = 'scooter' | 'motorcycle' | 'bicycle';

@Component({
  selector: 'app-rental-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LocationPickerComponent,
    ServiceVerificationComponent,
  ],
  templateUrl: './rental-wizard.html',
  styleUrl: './rental-wizard.scss',
})
export class RentalWizard implements OnInit, OnDestroy {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Location & Pickup' },
    { num: 3, label: 'Photos & Specs' },
    { num: 4, label: 'Pricing & Terms' },
    { num: 5, label: 'Fleet & Availability' },
    { num: 6, label: 'Verification' },
  ];

  readonly bicycleSubtypes: readonly { value: RentalSubtype; label: string }[] = [
    { value: 'city', label: 'City Bicycle' },
    { value: 'mountain', label: 'Mountain Bicycle' },
    { value: 'road', label: 'Road Bicycle' },
    { value: 'hybrid', label: 'Hybrid Bicycle' },
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
    Uva: ['Badulla', 'Moneragala'],
    Sabaragamuwa: ['Ratnapura', 'Kegalle'],
  };

  readonly currentStep = signal<number>(1);
  readonly listingId = signal<number | null>(null);
  readonly verificationStatus = signal<VerificationStatus>('draft');
  readonly decisionReason = signal<string | null>(null);
  readonly isActive = signal<boolean>(false);

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isSubmitted = signal<boolean>(false);
  readonly isUploadingPhoto = signal<boolean>(false);
  readonly isSavingUnit = signal<boolean>(false);
  readonly isSavingSlot = signal<boolean>(false);

  readonly errorMessage = signal<string | null>(null);
  readonly fleetErrorMessage = signal<string | null>(null);
  readonly saveToast = signal<string | null>(null);

  readonly isSuspended = computed(() => this.verificationStatus() === 'suspended');

  // Step 1 — Vehicle Basic Information
  vehicleKind: UiVehicleKind = 'scooter';
  bicycleSubtype: RentalSubtype = 'city';
  title = '';
  brand = '';
  model = '';
  transmission: RentalTransmission = 'automatic';
  fuelType = 'Petrol';
  modelYear: number | null = 2025;
  seatingCapacity = 2;
  description = '';
  specifications = '';

  // Step 2 — Location & Pickup Point
  province = 'Southern';
  district = 'Galle';
  locality = '';
  pickupName = '';
  pickupAddress = '';
  pickupInstructions = '';
  readonly latitude = signal<number>(6.0329);
  readonly longitude = signal<number>(80.2168);
  hasExplicitCoordinates = false;

  // Step 3 — Photos & Equipment
  readonly photos = signal<PhotoPreview[]>([]);
  helmetsIncluded = true;
  accessoriesSummary = '';

  // Step 4 — Pricing & Conditions (Daily MVP Pricing)
  pricePerDay = 2500;
  minimumAge = 18;
  rentalTerms = 'Return vehicle in clean working condition to the agreed pickup point.';
  requirementsText = '';
  cancellationPolicy = 'Free cancellation up to 24 hours before pickup.';

  // Step 5 — Physical Fleet Units & Availability
  readonly units = signal<RentalUnitResponse[]>([]);
  newUnitLabel = '';
  selectedUnitId: number | null = null;
  readonly slots = signal<AvailabilitySlotResponse[]>([]);
  slotStartDate = this.defaultFutureDate(1);
  slotStartTime = '08:00';
  slotEndDate = this.defaultFutureDate(7);
  slotEndTime = '18:00';
  slotIsOpen = true;

  // Step 6 — Documents & Service Verification
  evidenceState: VerificationDataState = {
    evidence: { links: [], notes: '' },
    files: [],
  };
  readonly verificationInitialData = signal<Partial<VerificationDataState> | undefined>(undefined);
  declarationAccepted = false;

  private readonly objectUrls = new Map<number, string>();

  get apiCategory(): ListingCategory {
    return this.vehicleKind === 'bicycle' ? 'bicycle' : 'bike';
  }

  get activeSubtype(): RentalSubtype {
    if (this.vehicleKind === 'scooter') return 'scooter';
    if (this.vehicleKind === 'motorcycle') return 'motorcycle';
    return this.bicycleSubtype;
  }

  get isMotorized(): boolean {
    return this.vehicleKind !== 'bicycle';
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const parsedId = idParam ? Number(idParam) : null;
    if (parsedId && Number.isInteger(parsedId) && parsedId > 0) {
      this.listingId.set(parsedId);
      this.loadExistingListing(parsedId);
    } else if (this.isPreview()) {
      const sample = this.previewService.sampleListings.find(
        (l) => l.listing.category === 'bike' || l.listing.category === 'bicycle'
      );
      if (sample) {
        this.hydrateFromReview(sample);
      }
      this.isLoading.set(false);
    } else {
      this.syncRequirementsTemplate();
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  onVehicleKindChange(kind: UiVehicleKind): void {
    this.vehicleKind = kind;
    if (kind === 'bicycle') {
      if (this.transmission === 'automatic') {
        this.transmission = 'manual';
      }
      this.seatingCapacity = 1;
      this.fuelType = 'Human-Powered';
    } else {
      if (this.transmission === 'single_speed') {
        this.transmission = kind === 'scooter' ? 'automatic' : 'manual';
      }
      this.seatingCapacity = 2;
      if (!this.fuelType || this.fuelType === 'Human-Powered') {
        this.fuelType = 'Petrol';
      }
    }
    this.syncRequirementsTemplate();
  }

  syncRequirementsTemplate(): void {
    if (this.requirementsText.trim()) return;
    if (this.isMotorized) {
      this.requirementsText =
        'Valid motorcycle driving license required. Provider checks the original license at pickup.';
    } else {
      this.requirementsText =
        'No driving license required. Riders must bring valid identification for handover.';
    }
  }

  getAvailableDistricts(): string[] {
    return this.districtsMap[this.province] || [];
  }

  onProvinceChange(): void {
    const districts = this.getAvailableDistricts();
    if (!districts.includes(this.district)) {
      this.district = districts[0] || '';
    }
  }

  onCoordinatesSelected(coords: { lat: number; lng: number }): void {
    this.latitude.set(coords.lat);
    this.longitude.set(coords.lng);
    this.hasExplicitCoordinates = true;
  }

  onVerificationChange(state: VerificationDataState): void {
    this.evidenceState = state;
  }

  private async loadExistingListing(id: number): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const review = await firstValueFrom(this.providerService.getProviderListing(id));
      if (!review) {
        this.errorMessage.set('Rental vehicle listing not found.');
        this.isLoading.set(false);
        return;
      }
      this.hydrateFromReview(review);
      await this.loadAvailabilitySlots(id);
    } catch (err) {
      this.errorMessage.set(this.formatError(err, 'Failed to load vehicle draft.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private hydrateFromReview(review: ReviewListing): void {
    const l = review.listing;
    const details = review.details || {};
    const rental = (details['rental'] || {}) as Partial<RentalMetadataPayload>;

    this.listingId.set(l.id);
    this.verificationStatus.set(review.verification_status);
    this.decisionReason.set(review.decision_reason);
    this.isActive.set(l.is_active);

    if (l.category === 'bicycle') {
      this.vehicleKind = 'bicycle';
      this.bicycleSubtype = (rental.subtype as RentalSubtype) || 'city';
    } else {
      this.vehicleKind = rental.subtype === 'motorcycle' ? 'motorcycle' : 'scooter';
    }

    this.title = l.title || '';
    this.description = l.description || '';
    this.district = l.district || 'Galle';
    this.locality = l.locality || '';
    this.province = String(details['province'] || this.findProvinceForDistrict(this.district) || 'Southern');
    this.pricePerDay = Number(l.price) || 2500;

    if (l.latitude && l.longitude) {
      this.latitude.set(Number(l.latitude));
      this.longitude.set(Number(l.longitude));
      this.hasExplicitCoordinates = true;
    }

    if (rental.transmission) this.transmission = rental.transmission;
    this.modelYear = rental.model_year ?? 2025;
    this.seatingCapacity = rental.seating_capacity ?? (this.isMotorized ? 2 : 1);
    this.fuelType = rental.fuel_type || (this.isMotorized ? 'Petrol' : 'Human-Powered');
    this.specifications = rental.specifications || '';
    this.pickupName = rental.pickup_name || String(details['pickup_name'] || '');
    this.pickupAddress = rental.pickup_address || String(details['address'] || '');
    this.requirementsText = rental.requirements || '';
    this.rentalTerms = rental.rental_terms || this.rentalTerms;
    this.cancellationPolicy = rental.cancellation_policy || this.cancellationPolicy;

    const unitList: RentalUnitResponse[] = Array.isArray(l.units)
      ? l.units.map((u: any) => ({
          id: Number(u.id),
          listing_id: l.id,
          label: String(u.label || `Unit #${u.id}`),
          capacity: Number(u.capacity) || 1,
          is_active: u.is_active !== false,
        }))
      : [];
    this.units.set(unitList);
    if (unitList.length > 0 && !this.selectedUnitId) {
      this.selectedUnitId = unitList[0].id;
    }

    const links = Array.isArray(details['links']) ? (details['links'] as EvidenceLink[]) : [];
    const notes = typeof details['notes'] === 'string' ? details['notes'] : '';
    const files = Array.isArray(details['files']) ? (details['files'] as EvidenceFileResponse[]) : [];
    this.verificationInitialData.set({ evidence: { links, notes }, files });

    this.syncPhotoPreviews(l.id, l.media || []);
  }

  private findProvinceForDistrict(district: string): string | null {
    for (const [prov, list] of Object.entries(this.districtsMap)) {
      if (list.includes(district)) return prov;
    }
    return null;
  }

  private syncPhotoPreviews(listingId: number, media: ListingMediaResponse[]): void {
    const mapped: PhotoPreview[] = media.map((m) => ({
      media: m,
      url: m.image_url || this.objectUrls.get(m.id) || null,
    }));
    this.photos.set(mapped);

    if (this.isPreview()) return;
    for (const m of media) {
      if (m.image_url || this.objectUrls.has(m.id)) continue;
      this.providerService.getPhotoBlob(listingId, m.id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.objectUrls.set(m.id, url);
          this.photos.update((curr) =>
            curr.map((p) =>
              p.media.id === m.id ? { ...p, url: this.sanitizer.bypassSecurityTrustUrl(url) } : p
            )
          );
        },
      });
    }
  }

  private buildSpecificationsString(): string | null {
    const parts = [
      this.brand.trim() && this.model.trim()
        ? `${this.brand.trim()} ${this.model.trim()}`
        : this.brand.trim() || this.model.trim(),
      this.specifications.trim(),
      this.helmetsIncluded ? 'Helmet included' : '',
      this.accessoriesSummary.trim() ? `Accessories: ${this.accessoriesSummary.trim()}` : '',
    ].filter(Boolean);
    return parts.join(' | ').slice(0, 2000) || null;
  }

  private buildRequirementsString(): string | null {
    const ageLine = this.minimumAge >= 12 ? `Minimum age: ${this.minimumAge} years.` : '';
    const instr = this.pickupInstructions.trim() ? `Pickup instructions: ${this.pickupInstructions.trim()}` : '';
    const licenseLine = this.isMotorized
      ? 'Valid motorcycle driving license required; original checked at pickup.'
      : 'No motorized driving license required for bicycles.';
    const combined = [licenseLine, ageLine, this.requirementsText.trim(), instr]
      .filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx)
      .join(' ');
    return combined.slice(0, 2000) || null;
  }

  private buildDraftPayload(): ListingDraftUpdate {
    const rental: RentalMetadataPayload = {
      subtype: this.activeSubtype,
      transmission: this.isMotorized
        ? this.transmission
        : this.transmission === 'automatic'
          ? 'manual'
          : this.transmission,
      model_year: this.modelYear || null,
      seating_capacity: this.isMotorized ? Math.min(2, Math.max(1, this.seatingCapacity || 2)) : 1,
      fuel_type: this.fuelType.trim() || null,
      specifications: this.buildSpecificationsString(),
      pickup_name: this.pickupName.trim() || this.locality.trim() || this.district || 'Pickup Point',
      pickup_address: this.pickupAddress.trim() || null,
      requirements: this.buildRequirementsString(),
      rental_terms: this.rentalTerms.trim() || null,
      cancellation_policy: this.cancellationPolicy.trim() || null,
    };

    return {
      category: this.apiCategory,
      title: this.title.trim() || null,
      description: this.description.trim() || null,
      province: this.province || null,
      district: this.district || null,
      locality: this.locality.trim() || null,
      address: this.pickupAddress.trim() || null,
      latitude: this.latitude().toFixed(6),
      longitude: this.longitude().toFixed(6),
      price: Number(this.pricePerDay) > 0 ? Number(this.pricePerDay).toFixed(2) : null,
      rental,
    };
  }

  async ensureDraftAndSave(): Promise<number | null> {
    if (this.isPreview()) {
      this.showToast('Preview changes verified locally (not saved to backend).');
      return this.listingId();
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      let id = this.listingId();
      if (!id) {
        const created = await firstValueFrom(
          this.providerService.createDraftListing(this.apiCategory)
        );
        id = created.listing.id;
        this.listingId.set(id);
        this.verificationStatus.set(created.verification_status);
      }

      const updated = await firstValueFrom(
        this.providerService.updateListingDraft(id, this.buildDraftPayload())
      );
      this.verificationStatus.set(updated.verification_status);
      this.isActive.set(updated.listing.is_active);
      this.showToast('Draft saved to backend.');
      return id;
    } catch (err) {
      this.errorMessage.set(this.formatError(err, 'Could not save vehicle draft.'));
      return null;
    } finally {
      this.isSaving.set(false);
    }
  }

  async nextStep(): Promise<void> {
    this.errorMessage.set(null);
    if (!this.validateCurrentStep()) return;

    if (!this.isPreview()) {
      const savedId = await this.ensureDraftAndSave();
      if (!savedId) return;
      if (this.currentStep() === 4 && this.units().length === 0) {
        // Ensure at least one starter unit exists when entering Step 5 if empty
        await this.addFleetUnit(`${this.title.trim() || 'Vehicle'} #1`);
      }
      if (this.currentStep() === 4) {
        await this.loadAvailabilitySlots(savedId);
      }
    }

    this.currentStep.update((s) => Math.min(6, s + 1));
  }

  prevStep(): void {
    this.errorMessage.set(null);
    this.currentStep.update((s) => Math.max(1, s - 1));
  }

  goToStep(step: number): void {
    if (step < 1 || step > 6) return;
    if (step > this.currentStep() && !this.validateCurrentStep()) return;
    this.errorMessage.set(null);
    this.currentStep.set(step);
  }

  private validateCurrentStep(): boolean {
    const step = this.currentStep();
    if (step === 1) {
      if (!this.title.trim()) {
        this.errorMessage.set('Please enter a vehicle name or listing title.');
        return false;
      }
      if (!this.description.trim()) {
        this.errorMessage.set('Please add a brief description of the vehicle.');
        return false;
      }
    }
    if (step === 2) {
      if (!this.district.trim() || !this.locality.trim()) {
        this.errorMessage.set('Please select a district and enter the pickup city/locality.');
        return false;
      }
      if (!this.pickupName.trim()) {
        this.errorMessage.set('Please provide a pickup point name.');
        return false;
      }
    }
    if (step === 4) {
      if (!(Number(this.pricePerDay) > 0)) {
        this.errorMessage.set('Please enter a valid daily rental rate in LKR.');
        return false;
      }
    }
    return true;
  }

  async onPhotoSelected(event: Event): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Photo uploads are disabled in Preview Mode.');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    const id = await this.ensureDraftAndSave();
    if (!id) {
      input.value = '';
      return;
    }

    this.isUploadingPhoto.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(this.providerService.uploadPhoto(id, file, this.title.trim() || 'Vehicle photo'));
      const refreshed = await firstValueFrom(this.providerService.getProviderListing(id));
      if (refreshed) {
        this.syncPhotoPreviews(id, refreshed.listing.media || []);
      }
      this.showToast('Vehicle photograph uploaded.');
    } catch (err) {
      this.errorMessage.set(this.formatError(err, 'Failed to upload vehicle photo.'));
    } finally {
      this.isUploadingPhoto.set(false);
      input.value = '';
    }
  }

  async setCover(photoId: number): Promise<void> {
    const id = this.listingId();
    if (!id || this.isPreview()) return;
    try {
      const updated = await firstValueFrom(this.providerService.setCoverPhoto(id, photoId));
      this.syncPhotoPreviews(id, updated.listing.media || []);
      this.showToast('Cover photo updated.');
    } catch (err) {
      this.errorMessage.set(this.formatError(err, 'Failed to update cover photo.'));
    }
  }

  async removePhoto(photoId: number): Promise<void> {
    const id = this.listingId();
    if (!id || this.isPreview()) return;
    try {
      await firstValueFrom(this.providerService.deletePhoto(id, photoId));
      const refreshed = await firstValueFrom(this.providerService.getProviderListing(id));
      if (refreshed) {
        this.syncPhotoPreviews(id, refreshed.listing.media || []);
      }
    } catch (err) {
      this.errorMessage.set(this.formatError(err, 'Could not delete vehicle photo.'));
    }
  }

  async addFleetUnit(defaultLabel?: string): Promise<void> {
    const label = (defaultLabel ?? this.newUnitLabel).trim();
    if (!label) {
      this.fleetErrorMessage.set('Enter a unit label or plate identifier (e.g. Scooter #1).');
      return;
    }
    if (this.isPreview()) {
      this.fleetErrorMessage.set('Adding units is disabled in Preview Mode.');
      return;
    }

    const id = await this.ensureDraftAndSave();
    if (!id) return;

    this.isSavingUnit.set(true);
    this.fleetErrorMessage.set(null);
    try {
      const created = await firstValueFrom(
        this.providerService.createRentalUnit(id, { label, capacity: 1 })
      );
      this.units.update((curr) => [...curr, created]);
      this.selectedUnitId = created.id;
      if (!defaultLabel) this.newUnitLabel = '';
      this.showToast(`Added fleet unit "${created.label}".`);
    } catch (err) {
      this.fleetErrorMessage.set(this.formatError(err, 'Failed to add vehicle unit.'));
    } finally {
      this.isSavingUnit.set(false);
    }
  }

  async toggleUnitActive(unit: RentalUnitResponse): Promise<void> {
    const id = this.listingId();
    if (!id || this.isPreview()) return;
    this.isSavingUnit.set(true);
    this.fleetErrorMessage.set(null);
    try {
      const updated = await firstValueFrom(
        this.providerService.updateRentalUnit(id, unit.id, {
          label: unit.label,
          is_active: !unit.is_active,
        })
      );
      this.units.update((curr) => curr.map((u) => (u.id === unit.id ? updated : u)));
      this.showToast(`${updated.label} is now ${updated.is_active ? 'active' : 'inactive'}.`);
    } catch (err) {
      this.fleetErrorMessage.set(this.formatError(err, 'Failed to update unit status.'));
    } finally {
      this.isSavingUnit.set(false);
    }
  }

  async loadAvailabilitySlots(id: number): Promise<void> {
    try {
      const slots = await firstValueFrom(this.providerService.getAvailabilitySlots(id, 100, 0));
      this.slots.set(slots.sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    } catch {
      // Non-fatal on draft step
    }
  }

  async addAvailabilityWindow(): Promise<void> {
    if (this.isPreview()) {
      this.fleetErrorMessage.set('Availability changes are disabled in Preview Mode.');
      return;
    }
    const id = this.listingId();
    if (!id) return;
    const unitId = this.selectedUnitId || this.units()[0]?.id;
    if (!unitId) {
      this.fleetErrorMessage.set('Add at least one physical vehicle unit before setting availability.');
      return;
    }

    const startsAt = `${this.slotStartDate}T${this.slotStartTime}:00+05:30`;
    const endsAt = `${this.slotEndDate}T${this.slotEndTime}:00+05:30`;
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      this.fleetErrorMessage.set('End date & time must be after start date & time.');
      return;
    }

    const payload: AvailabilitySlotCreate = {
      unit_id: unitId,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: 1,
      is_open: this.slotIsOpen,
    };

    this.isSavingSlot.set(true);
    this.fleetErrorMessage.set(null);
    try {
      const created = await firstValueFrom(this.providerService.addAvailabilitySlot(id, payload));
      this.slots.update((curr) =>
        [...curr, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      );
      this.showToast(created.is_open ? 'Available window added.' : 'Unavailable block recorded.');
    } catch (err) {
      this.fleetErrorMessage.set(
        this.formatError(err, 'Could not save availability window (check for overlaps or bookings).')
      );
    } finally {
      this.isSavingSlot.set(false);
    }
  }

  async toggleSlotOpen(slot: AvailabilitySlotResponse): Promise<void> {
    const id = this.listingId();
    if (!id || this.isPreview()) return;
    this.isSavingSlot.set(true);
    this.fleetErrorMessage.set(null);
    try {
      const updated = await firstValueFrom(
        this.providerService.updateAvailabilitySlot(id, slot.id, {
          unit_id: slot.unit_id,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          capacity: 1,
          is_open: !slot.is_open,
        })
      );
      this.slots.update((curr) => curr.map((s) => (s.id === slot.id ? updated : s)));
      this.showToast(updated.is_open ? 'Window reopened.' : 'Dates blocked.');
    } catch (err) {
      this.fleetErrorMessage.set(
        this.formatError(err, 'Cannot block a window with active reservations.')
      );
    } finally {
      this.isSavingSlot.set(false);
    }
  }

  unitLabel(unitId: number): string {
    return this.units().find((u) => u.id === unitId)?.label || `Unit #${unitId}`;
  }

  submitForVerification(): void {
    if (this.isPreview()) {
      this.errorMessage.set('Listing submission is disabled in Preview Mode.');
      return;
    }
    if (!this.declarationAccepted) {
      this.errorMessage.set('Please accept the verification declaration before submitting.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    void (async () => {
      try {
        const id = await this.ensureDraftAndSave();
        if (!id) {
          this.isSubmitting.set(false);
          return;
        }
        await firstValueFrom(
          this.providerService.saveEvidence(id, this.evidenceState.evidence)
        );
        const submitted = await firstValueFrom(
          this.providerService
            .submitListing(id)
            .pipe(finalize(() => this.isSubmitting.set(false)))
        );
        this.verificationStatus.set(submitted.verification_status);
        this.isSubmitted.set(true);
        void this.router.navigate(['/provider/listings'], {
          queryParams: this.previewQueryParams(),
        });
      } catch (err) {
        this.errorMessage.set(
          this.formatError(err, 'Submission failed. Ensure photos, fleet unit, and ownership evidence or notes are added.')
        );
        this.isSubmitting.set(false);
      }
    })();
  }

  private defaultFutureDate(daysAhead: number): string {
    const d = new Date(Date.now() + daysAhead * 86_400_000 + 19_800_000);
    return d.toISOString().slice(0, 10);
  }

  private showToast(msg: string): void {
    this.saveToast.set(msg);
    setTimeout(() => {
      if (this.saveToast() === msg) this.saveToast.set(null);
    }, 3000);
  }

  private formatError(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d?.msg).filter(Boolean).join('; ') || fallback;
    }
    if (err?.status === 401) return 'Session expired. Please sign in again.';
    if (err?.status === 403) return 'You do not have permission for this action.';
    if (err?.status === 409) return detail || 'Booking or inventory conflict detected.';
    return err?.message || fallback;
  }
}
