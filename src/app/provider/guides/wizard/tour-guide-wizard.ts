import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, firstValueFrom, of } from 'rxjs';
import {
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  EvidenceFileResponse,
  EvidenceLink,
  GUIDE_BACKEND_CATEGORIES,
  GUIDE_DISCOVERY_CATEGORIES,
  GUIDE_LANGUAGE_OPTIONS,
  GuideCategorySlug,
  GuideLanguagePayload,
  GuidePackageDetails,
  GuidePackagePayload,
  GuidePackagePricingType,
  GuideProficiencyLevel,
  GuideProfileMetadataPayload,
  GuideServiceAreaPayload,
  HomestayBookingDetails,
  ListingDraftUpdate,
  ListingMediaResponse,
  ReviewListing,
  VerificationStatus,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { ProviderPreviewService } from '../../provider-preview.service';
import { LocationPickerComponent } from '../../../shared/components/location-picker/location-picker.component';
import {
  ServiceVerificationComponent,
  VerificationDataState,
} from '../../../shared/components/service-verification/service-verification.component';

interface PhotoPreview {
  media: ListingMediaResponse;
  url: SafeUrl | string | null;
}

@Component({
  selector: 'app-tour-guide-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LocationPickerComponent,
    ServiceVerificationComponent,
  ],
  templateUrl: './tour-guide-wizard.html',
  styleUrl: './tour-guide-wizard.scss',
})
export class TourGuideWizard implements OnInit, OnDestroy {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly steps = [
    { num: 1, label: 'Personal Info' },
    { num: 2, label: 'Location & Areas' },
    { num: 3, label: 'Languages & Skills' },
    { num: 4, label: 'Tour Packages' },
    { num: 5, label: 'Availability' },
    { num: 6, label: 'Verification' },
  ];

  readonly backendCategories = GUIDE_BACKEND_CATEGORIES;
  readonly discoveryCategories = GUIDE_DISCOVERY_CATEGORIES;
  readonly languageOptions = GUIDE_LANGUAGE_OPTIONS;
  readonly proficiencyLevels: GuideProficiencyLevel[] = [
    'native',
    'fluent',
    'conversational',
    'basic',
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
  readonly isSavingPackage = signal<boolean>(false);
  readonly isSavingSlot = signal<boolean>(false);

  readonly errorMessage = signal<string | null>(null);
  readonly packageErrorMessage = signal<string | null>(null);
  readonly slotErrorMessage = signal<string | null>(null);
  readonly saveToast = signal<string | null>(null);

  readonly isSuspended = computed(() => this.verificationStatus() === 'suspended');

  // Step 1 — Personal & Professional Information
  guideName = '';
  professionalTitle = '';
  shortIntro = '';
  biography = '';
  yearsOfExperience = 2;
  startingPrice = 5000;
  readonly photos = signal<PhotoPreview[]>([]);

  // Step 2 — Location & Service Areas
  province = 'Central';
  district = 'Kandy';
  locality = '';
  address = '';
  meetingPoint = '';
  readonly latitude = signal<number>(7.2906);
  readonly longitude = signal<number>(80.6337);
  hasExplicitCoordinates = false;
  serviceAreas: GuideServiceAreaPayload[] = [
    { province: 'Central', district: 'Kandy', city: 'Kandy', is_primary: true },
  ];
  newAreaProvince = 'Central';
  newAreaDistrict = 'Matale';
  newAreaCity = '';

  // Step 3 — Languages & Specializations
  selectedBackendCategories: GuideCategorySlug[] = ['cultural_heritage'];
  languages: GuideLanguagePayload[] = [
    {
      language_code: 'en',
      language_name: 'English',
      proficiency_level: 'fluent',
      is_primary: true,
    },
  ];
  newLangCode = 'si';
  newLangProficiency: GuideProficiencyLevel = 'fluent';
  cancellationPolicy = 'Free cancellation up to 48 hours prior to departure.';

  // Step 4 — Tour Packages & Pricing
  readonly packages = signal<GuidePackageDetails[]>([]);
  editingPackageId: number | null = null;
  pkgTitle = '';
  pkgDescription = '';
  pkgItinerary = '';
  pkgDurationHours = 4;
  pkgPricingType: GuidePackagePricingType = 'per_person';
  pkgPrice = 6500;
  pkgMinTravelers = 1;
  pkgMaxPeople = 8;
  pkgDestinationsText = '';
  pkgIncludedServices = '';
  pkgExcludedServices = '';
  pkgMeetingPoint = '';
  pkgIsActive = true;

  // Step 5 — Availability Management
  readonly slots = signal<AvailabilitySlotResponse[]>([]);
  readonly guideBookings = signal<HomestayBookingDetails[]>([]);
  selectedSlotPackageId: number | null = null;
  editingSlotId: number | null = null;
  slotDate = this.defaultFutureDate();
  slotStartTime = '08:00';
  slotEndTime = '12:00';
  slotCapacity = 6;
  slotIsOpen = true;

  // Step 6 — Qualifications & Verification
  readonly evidenceLinks = signal<EvidenceLink[]>([]);
  readonly evidenceNotes = signal<string>('');
  readonly evidenceFiles = signal<EvidenceFileResponse[]>([]);
  readonly verificationInitialData = signal<Partial<VerificationDataState> | undefined>(
    undefined
  );
  declarationAccepted = false;

  private draftCreationPromise: Promise<number> | null = null;
  private readonly objectUrls = new Map<number, string>();

  ngOnInit(): void {
    const paramId = this.route.snapshot.paramMap.get('id');
    const queryId = this.route.snapshot.queryParamMap.get('listingId');
    const rawId = paramId ?? queryId;

    if (this.isPreview()) {
      const requestedId = rawId ? Number(rawId) : null;
      const sample =
        (requestedId
          ? this.previewService.sampleListings.find(
              (l) => l.listing.id === requestedId && l.listing.category === 'guide'
            )
          : undefined) ??
        this.previewService.sampleListings.find((l) => l.listing.category === 'guide');

      if (sample) {
        this.hydrateFromReview(sample);
        const pkgs = Array.isArray(sample.details?.['packages'])
          ? (sample.details['packages'] as GuidePackageDetails[])
          : [];
        this.packages.set(pkgs);
        this.syncDefaultSlotPackage(pkgs);
        this.slots.set(this.previewService.sampleSlotsMap[sample.listing.id] ?? []);
        this.guideBookings.set(
          this.previewService.sampleBookings.filter(
            (b) => b.listing_id === sample.listing.id
          )
        );
      }
      this.isLoading.set(false);
      return;
    }

    if (rawId) {
      const parsedId = Number(rawId);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        this.loadExistingDraft(parsedId);
        return;
      }
      this.errorMessage.set('Invalid tour guide listing identifier.');
      this.isLoading.set(false);
      return;
    }

    this.initializeSingleServerDraft();
  }

  ngOnDestroy(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  get availableDistricts(): string[] {
    return this.districtsMap[this.province] || [];
  }

  get newAreaDistricts(): string[] {
    return this.districtsMap[this.newAreaProvince] || [];
  }

  get activePackages(): GuidePackageDetails[] {
    return this.packages().filter((p) => p.is_active);
  }

  get selectedSlotPackage(): GuidePackageDetails | null {
    return this.packages().find((p) => p.id === Number(this.selectedSlotPackageId)) ?? null;
  }

  get hasQualificationEvidence(): boolean {
    const hasRequiredDoc = this.evidenceFiles().some(
      (f) => f.kind === 'license' || f.kind === 'credentials'
    );
    return hasRequiredDoc || this.evidenceNotes().trim().length > 0;
  }

  get selectedCategoriesDisplay(): string {
    return this.selectedBackendCategories
      .map(
        (slug) =>
          this.backendCategories.find((cat) => cat.slug === slug)?.name || slug
      )
      .join(', ');
  }

  get minimumActivePackagePrice(): number {
    const active = this.activePackages;
    if (active.length === 0) return this.startingPrice;
    const min = Math.min(...active.map((p) => Number(p.price) || 0).filter((n) => n > 0));
    return Number.isFinite(min) && min > 0 ? min : this.startingPrice;
  }

  isDiscoverySelected(slug: GuideCategorySlug): boolean {
    return this.selectedBackendCategories.includes(slug);
  }

  toggleBackendCategory(slug: GuideCategorySlug): void {
    this.errorMessage.set(null);
    if (this.selectedBackendCategories.includes(slug)) {
      this.selectedBackendCategories = this.selectedBackendCategories.filter(
        (s) => s !== slug
      );
      return;
    }
    if (this.selectedBackendCategories.length >= 4) {
      this.errorMessage.set('You can select up to 4 backend guide specializations.');
      return;
    }
    this.selectedBackendCategories = [...this.selectedBackendCategories, slug];
  }

  selectDiscoveryCategory(slug: GuideCategorySlug): void {
    this.toggleBackendCategory(slug);
  }

  onProvinceChange(): void {
    const allowed = this.availableDistricts;
    if (allowed.length > 0 && !allowed.includes(this.district)) {
      this.district = allowed[0];
    }
    this.syncPrimaryServiceArea();
  }

  onPrimaryLocationChange(): void {
    this.syncPrimaryServiceArea();
  }

  onNewAreaProvinceChange(): void {
    const allowed = this.newAreaDistricts;
    if (allowed.length > 0 && !allowed.includes(this.newAreaDistrict)) {
      this.newAreaDistrict = allowed[0];
    }
  }

  onCoordinatesChange(coords: { lat: number; lng: number }): void {
    this.latitude.set(Number(coords.lat.toFixed(6)));
    this.longitude.set(Number(coords.lng.toFixed(6)));
    this.hasExplicitCoordinates = true;
  }

  addServiceArea(): void {
    this.errorMessage.set(null);
    const city = this.newAreaCity.trim() || this.newAreaDistrict;
    const exists = this.serviceAreas.some(
      (a) =>
        a.district.toLowerCase() === this.newAreaDistrict.toLowerCase() &&
        a.city.toLowerCase() === city.toLowerCase()
    );
    if (exists) {
      this.errorMessage.set('This district and town/city is already listed in your service areas.');
      return;
    }
    if (this.serviceAreas.length >= 30) {
      this.errorMessage.set('Maximum 30 service areas are allowed.');
      return;
    }
    this.serviceAreas = [
      ...this.serviceAreas,
      {
        province: this.newAreaProvince,
        district: this.newAreaDistrict,
        city,
        is_primary: this.serviceAreas.length === 0,
      },
    ];
    this.newAreaCity = '';
  }

  setPrimaryServiceArea(index: number): void {
    this.serviceAreas = this.serviceAreas.map((area, i) => ({
      ...area,
      is_primary: i === index,
    }));
  }

  removeServiceArea(index: number): void {
    if (this.serviceAreas.length <= 1) {
      this.errorMessage.set('Keep at least one primary service area.');
      return;
    }
    const next = this.serviceAreas.filter((_, i) => i !== index);
    if (!next.some((a) => a.is_primary) && next.length > 0) {
      next[0] = { ...next[0], is_primary: true };
    }
    this.serviceAreas = next;
  }

  addLanguage(): void {
    this.errorMessage.set(null);
    const option = this.languageOptions.find((l) => l.code === this.newLangCode);
    if (!option) return;
    if (this.languages.some((l) => l.language_code === option.code)) {
      this.errorMessage.set(`${option.name} is already added.`);
      return;
    }
    this.languages = [
      ...this.languages,
      {
        language_code: option.code,
        language_name: option.name,
        proficiency_level: this.newLangProficiency,
        is_primary: this.languages.length === 0,
      },
    ];
  }

  setPrimaryLanguage(index: number): void {
    this.languages = this.languages.map((lang, i) => ({
      ...lang,
      is_primary: i === index,
    }));
  }

  removeLanguage(index: number): void {
    if (this.languages.length <= 1) {
      this.errorMessage.set('At least one spoken language is required.');
      return;
    }
    const next = this.languages.filter((_, i) => i !== index);
    if (!next.some((l) => l.is_primary) && next.length > 0) {
      next[0] = { ...next[0], is_primary: true };
    }
    this.languages = next;
  }

  // --- Step Navigation ---
  goToStep(stepNum: number): void {
    if (stepNum < 1 || stepNum > 6) return;
    if (stepNum < this.currentStep()) {
      this.errorMessage.set(null);
      this.currentStep.set(stepNum);
      return;
    }
    if (stepNum === this.currentStep() + 1) {
      void this.nextStep();
    }
  }

  async nextStep(): Promise<void> {
    this.errorMessage.set(null);
    const step = this.currentStep();
    if (!this.validateStep(step)) {
      return;
    }

    if (this.isPreview() || this.isSuspended()) {
      if (step === 2 && !this.pkgMeetingPoint.trim()) {
        this.pkgMeetingPoint = this.meetingPoint.trim();
      }
      if (step < 6) this.currentStep.set(step + 1);
      return;
    }

    const saved = await this.persistCurrentStep(step);
    if (!saved) return;

    if (step === 2 && !this.pkgMeetingPoint.trim()) {
      this.pkgMeetingPoint = this.meetingPoint.trim();
    }

    if (step < 6) {
      this.currentStep.set(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    this.errorMessage.set(null);
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async saveDraftProgress(): Promise<void> {
    this.errorMessage.set(null);
    if (this.isPreview()) {
      this.errorMessage.set('Draft saving is disabled in Preview Mode.');
      return;
    }
    if (this.isSuspended()) {
      this.errorMessage.set('Suspended listings cannot be edited.');
      return;
    }
    const ok = await this.persistCurrentStep(this.currentStep(), true);
    if (ok) {
      this.showToast('Tour guide draft saved on server.');
    }
  }

  retryDraftInitialization(): void {
    this.errorMessage.set(null);
    const id = this.listingId();
    if (id) {
      this.loadExistingDraft(id);
    } else {
      this.initializeSingleServerDraft();
    }
  }

  // --- Photos (Step 1 & 4) ---
  async onPhotoSelected(event: Event): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Photo uploads are disabled in Preview Mode.');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const files = Array.from(input.files);
    input.value = '';
    this.errorMessage.set(null);

    let id: number;
    try {
      id = await this.ensureServerDraft();
    } catch {
      return;
    }

    this.isUploadingPhoto.set(true);
    try {
      for (const file of files) {
        const uploaded = await firstValueFrom(
          this.providerService.uploadPhoto(id, file, this.guideName.trim() || file.name)
        );
        this.photos.update((curr) => [...curr, { media: uploaded, url: null }]);
        this.fetchPhotoPreview(id, uploaded.id);
      }
      this.showToast('Photograph uploaded to server.');
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Failed to upload photograph.')
      );
    } finally {
      this.isUploadingPhoto.set(false);
    }
  }

  async setCoverPhoto(photoId: number): Promise<void> {
    const id = this.listingId();
    if (!id || this.isSuspended() || this.isPreview()) return;
    this.errorMessage.set(null);
    try {
      const review = await firstValueFrom(
        this.providerService.setCoverPhoto(id, photoId)
      );
      this.syncMediaOrderFromListing(review);
      this.showToast('Primary profile photo updated.');
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Could not set cover photo.')
      );
    }
  }

  async deletePhoto(photoId: number): Promise<void> {
    const id = this.listingId();
    if (!id || this.isSuspended() || this.isPreview()) return;
    this.errorMessage.set(null);
    try {
      await firstValueFrom(this.providerService.deletePhoto(id, photoId));
      const existingUrl = this.objectUrls.get(photoId);
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
        this.objectUrls.delete(photoId);
      }
      this.photos.update((curr) => curr.filter((p) => p.media.id !== photoId));
      this.showToast('Photo removed.');
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Failed to delete photograph.')
      );
    }
  }

  // --- Step 4 Package Builder ---
  startEditPackage(pkg: GuidePackageDetails): void {
    this.packageErrorMessage.set(null);
    this.editingPackageId = pkg.id;
    this.pkgTitle = pkg.title;
    this.pkgDescription = pkg.description;
    this.pkgItinerary = pkg.itinerary || '';
    this.pkgDurationHours = Number(pkg.duration_hours) || 4;
    this.pkgPricingType = pkg.pricing_type;
    this.pkgPrice = Number(pkg.price) || 5000;
    this.pkgMaxPeople = Number(pkg.max_people) || 8;
    this.pkgIncludedServices = pkg.included_services || '';
    this.pkgExcludedServices = pkg.excluded_services || '';
    this.pkgMeetingPoint = pkg.meeting_point || this.meetingPoint;
    this.pkgIsActive = Boolean(pkg.is_active);
  }

  resetPackageForm(): void {
    this.editingPackageId = null;
    this.packageErrorMessage.set(null);
    this.pkgTitle = '';
    this.pkgDescription = '';
    this.pkgItinerary = '';
    this.pkgDurationHours = 4;
    this.pkgPricingType = 'per_person';
    this.pkgPrice = 6500;
    this.pkgMinTravelers = 1;
    this.pkgMaxPeople = 8;
    this.pkgDestinationsText = '';
    this.pkgIncludedServices = '';
    this.pkgExcludedServices = '';
    this.pkgMeetingPoint = this.meetingPoint.trim();
    this.pkgIsActive = true;
  }

  async savePackage(): Promise<void> {
    this.packageErrorMessage.set(null);
    if (this.isPreview()) {
      this.packageErrorMessage.set('Package creation and editing are disabled in Preview Mode.');
      return;
    }
    if (this.isSuspended()) {
      this.packageErrorMessage.set('Suspended listings cannot modify packages.');
      return;
    }

    if (this.pkgTitle.trim().length < 3) {
      this.packageErrorMessage.set('Package name must be at least 3 characters.');
      return;
    }
    if (this.pkgDescription.trim().length < 10) {
      this.packageErrorMessage.set('Package description must be at least 10 characters.');
      return;
    }
    if (!this.pkgDurationHours || Number(this.pkgDurationHours) <= 0) {
      this.packageErrorMessage.set('Duration (hours) must be greater than 0.');
      return;
    }
    if (!this.pkgPrice || Number(this.pkgPrice) <= 0) {
      this.packageErrorMessage.set('Package price in LKR must be greater than 0.');
      return;
    }
    if (Number(this.pkgMinTravelers) < 1 || Number(this.pkgMaxPeople) < Number(this.pkgMinTravelers)) {
      this.packageErrorMessage.set('Minimum travelers must be at least 1 and cannot exceed maximum travelers.');
      return;
    }
    const effectiveMeeting = (this.pkgMeetingPoint || this.meetingPoint).trim();
    if (effectiveMeeting.length < 3) {
      this.packageErrorMessage.set('Package meeting point must be at least 3 characters.');
      return;
    }

    const itineraryValue = this.pkgDestinationsText.trim() && !this.pkgItinerary.trim()
      ? `Destinations: ${this.pkgDestinationsText.trim()}`
      : this.pkgItinerary.trim() || null;

    const payload: GuidePackagePayload = {
      title: this.pkgTitle.trim(),
      description: this.pkgDescription.trim(),
      itinerary: itineraryValue,
      duration_hours: Number(this.pkgDurationHours).toFixed(2),
      pricing_type: this.pkgPricingType,
      price: Number(this.pkgPrice).toFixed(2),
      currency: 'LKR',
      max_people: Math.max(1, Number(this.pkgMaxPeople) || 1),
      included_services: this.pkgIncludedServices.trim() || null,
      excluded_services: this.pkgExcludedServices.trim() || null,
      meeting_point: effectiveMeeting,
      meeting_latitude: this.latitude().toFixed(6),
      meeting_longitude: this.longitude().toFixed(6),
      is_active: this.pkgIsActive,
    };

    this.isSavingPackage.set(true);
    try {
      const id = await this.ensureServerDraft();
      let savedPkg: GuidePackageDetails;
      if (this.editingPackageId !== null) {
        savedPkg = await firstValueFrom(
          this.providerService.updateGuidePackage(id, this.editingPackageId, payload)
        );
        this.packages.update((curr) =>
          curr.map((p) => (p.id === savedPkg.id ? savedPkg : p))
        );
        this.showToast('Tour package updated.');
      } else {
        savedPkg = await firstValueFrom(
          this.providerService.createGuidePackage(id, payload)
        );
        this.packages.update((curr) => [...curr, savedPkg]);
        this.showToast('Tour package added.');
      }
      this.syncDefaultSlotPackage(this.packages());
      this.syncListingPriceFromPackages();
      this.resetPackageForm();
    } catch (err: any) {
      this.packageErrorMessage.set(
        this.extractErrorMessage(err, 'Failed to save tour package.')
      );
    } finally {
      this.isSavingPackage.set(false);
    }
  }

  async togglePackageActive(pkg: GuidePackageDetails): Promise<void> {
    const id = this.listingId();
    if (!id || this.isPreview() || this.isSuspended()) return;
    this.packageErrorMessage.set(null);
    this.isSavingPackage.set(true);
    try {
      const updated = await firstValueFrom(
        this.providerService.updateGuidePackage(id, pkg.id, {
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
      );
      this.packages.update((curr) =>
        curr.map((p) => (p.id === updated.id ? updated : p))
      );
      this.syncDefaultSlotPackage(this.packages());
      this.showToast(updated.is_active ? 'Package activated.' : 'Package deactivated.');
    } catch (err: any) {
      this.packageErrorMessage.set(
        this.extractErrorMessage(err, 'Could not change package status.')
      );
    } finally {
      this.isSavingPackage.set(false);
    }
  }

  // --- Step 5 Availability Slots ---
  onSlotPackageOrStartChange(): void {
    const pkg = this.selectedSlotPackage;
    if (!pkg) return;
    if (!this.editingSlotId) {
      this.slotCapacity = pkg.max_people;
    }
    this.recomputeEndTimeFromPackage(pkg);
  }

  private recomputeEndTimeFromPackage(pkg: GuidePackageDetails): void {
    if (!this.slotStartTime) return;
    const [hStr, mStr] = this.slotStartTime.split(':');
    const startMins = Number(hStr) * 60 + Number(mStr);
    const durationMins = Math.round(Number(pkg.duration_hours) * 60);
    if (Number.isNaN(startMins) || Number.isNaN(durationMins) || durationMins <= 0) {
      return;
    }
    const endTotal = startMins + durationMins;
    if (endTotal < 24 * 60) {
      const eh = String(Math.floor(endTotal / 60)).padStart(2, '0');
      const em = String(endTotal % 60).padStart(2, '0');
      this.slotEndTime = `${eh}:${em}`;
    }
  }

  startEditSlot(slot: AvailabilitySlotResponse): void {
    this.slotErrorMessage.set(null);
    this.editingSlotId = slot.id;
    this.selectedSlotPackageId = slot.unit_id;
    const { date, startTime, endTime } = this.parseSlotDateTimes(
      slot.starts_at,
      slot.ends_at
    );
    this.slotDate = date;
    this.slotStartTime = startTime;
    this.slotEndTime = endTime;
    this.slotCapacity = slot.capacity;
    this.slotIsOpen = slot.is_open;
  }

  cancelSlotEdit(): void {
    this.editingSlotId = null;
    this.slotErrorMessage.set(null);
    const pkg = this.selectedSlotPackage;
    this.slotCapacity = pkg ? pkg.max_people : 6;
    this.slotIsOpen = true;
    if (pkg) this.recomputeEndTimeFromPackage(pkg);
  }

  async saveSlot(): Promise<void> {
    this.slotErrorMessage.set(null);
    if (this.isPreview()) {
      this.slotErrorMessage.set('Slot changes are disabled in Preview Mode.');
      return;
    }
    if (this.isSuspended()) {
      this.slotErrorMessage.set('Suspended listings cannot modify availability.');
      return;
    }
    const pkg = this.selectedSlotPackage;
    if (!pkg || !pkg.is_active) {
      this.slotErrorMessage.set('Select an active tour package first.');
      return;
    }
    if (!this.slotDate || !this.slotStartTime || !this.slotEndTime) {
      this.slotErrorMessage.set('Date, start time, and end time are required.');
      return;
    }

    const startsAt = `${this.slotDate}T${this.slotStartTime}:00+05:30`;
    const endsAt = this.computeIsoEndTimestamp(startsAt, Number(pkg.duration_hours));

    if (new Date(startsAt).getTime() <= Date.now()) {
      this.slotErrorMessage.set('Slot start time must be in the future.');
      return;
    }

    const cap = Number(this.slotCapacity);
    if (cap < 1 || cap > pkg.max_people) {
      this.slotErrorMessage.set(
        `Slot capacity must be between 1 and ${pkg.max_people} guests for this package.`
      );
      return;
    }

    const payload: AvailabilitySlotCreate = {
      unit_id: pkg.id,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: cap,
      is_open: this.slotIsOpen,
    };

    this.isSavingSlot.set(true);
    try {
      const id = this.listingId()!;
      if (this.editingSlotId !== null) {
        const updated = await firstValueFrom(
          this.providerService.updateAvailabilitySlot(id, this.editingSlotId, payload)
        );
        this.slots.update((curr) =>
          curr
            .map((s) => (s.id === updated.id ? updated : s))
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        );
        this.editingSlotId = null;
        this.showToast('Guide slot updated.');
      } else {
        const created = await firstValueFrom(
          this.providerService.addAvailabilitySlot(id, payload)
        );
        this.slots.update((curr) =>
          [...curr, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        );
        this.showToast('Availability slot created.');
      }
    } catch (err: any) {
      this.slotErrorMessage.set(
        this.extractErrorMessage(err, 'Failed to save availability slot.')
      );
    } finally {
      this.isSavingSlot.set(false);
    }
  }

  async toggleSlotOpen(slot: AvailabilitySlotResponse): Promise<void> {
    const id = this.listingId();
    if (!id || this.isPreview() || this.isSuspended()) return;
    this.slotErrorMessage.set(null);
    this.isSavingSlot.set(true);
    try {
      const updated = await firstValueFrom(
        this.providerService.updateAvailabilitySlot(id, slot.id, {
          unit_id: slot.unit_id,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          capacity: slot.capacity,
          is_open: !slot.is_open,
        })
      );
      this.slots.update((curr) =>
        curr.map((s) => (s.id === updated.id ? updated : s))
      );
      this.showToast(updated.is_open ? 'Slot unblocked.' : 'Slot blocked.');
    } catch (err: any) {
      this.slotErrorMessage.set(
        this.extractErrorMessage(err, 'Could not change slot status.')
      );
    } finally {
      this.isSavingSlot.set(false);
    }
  }

  packageTitleForSlot(unitId: number): string {
    return this.packages().find((p) => p.id === unitId)?.title || `Package #${unitId}`;
  }

  overlappingReservationForSlot(slot: AvailabilitySlotResponse): HomestayBookingDetails | null {
    const startMs = new Date(slot.starts_at).getTime();
    const endMs = new Date(slot.ends_at).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
    return (
      this.guideBookings().find((b) => {
        if (b.status !== 'pending' && b.status !== 'confirmed' && b.status !== 'completed') {
          return false;
        }
        const bStart = new Date(b.starts_at).getTime();
        const bEnd = new Date(b.ends_at).getTime();
        return bStart < endMs && bEnd > startMs;
      }) ?? null
    );
  }

  // --- Step 6 Verification & Submission ---
  onVerificationChange(state: VerificationDataState): void {
    this.evidenceLinks.set(state.evidence.links || []);
    this.evidenceNotes.set(state.evidence.notes || '');
    this.evidenceFiles.set(state.files || []);
  }

  async submitForVerification(): Promise<void> {
    this.errorMessage.set(null);
    if (this.isPreview()) {
      this.errorMessage.set('Listing submission is disabled in Preview Mode.');
      return;
    }
    if (this.isSuspended()) {
      this.errorMessage.set('Suspended listings cannot be submitted.');
      return;
    }

    for (let step = 1; step <= 4; step++) {
      if (!this.validateStep(step)) {
        this.currentStep.set(step);
        return;
      }
    }

    if (!this.hasQualificationEvidence) {
      this.errorMessage.set(
        'Upload at least one Guide License / Credentials file OR add verification notes explaining your qualifications.'
      );
      return;
    }

    if (!this.declarationAccepted) {
      this.errorMessage.set(
        'Please confirm the guide qualification accuracy and compliance declaration before submitting.'
      );
      return;
    }

    this.isSubmitting.set(true);
    try {
      const saved = await this.persistCurrentStep(6);
      if (!saved) return;

      const id = this.listingId()!;
      const submitted = await firstValueFrom(
        this.providerService.submitListing(id)
      );
      this.verificationStatus.set(submitted.verification_status);
      this.isActive.set(Boolean(submitted.listing.is_active));
      this.isSubmitted.set(true);
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Failed to submit tour guide listing for approval.')
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  formatSlotDisplay(iso: string): string {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString('en-LK', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // --- Server-Side Single Draft Lifecycle (No localStorage draft store) ---
  private initializeSingleServerDraft(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.providerService
      .getProviderListings(50, 0, 'guide')
      .pipe(catchError(() => of([] as ReviewListing[])))
      .subscribe({
        next: (existing) => {
          const resumableDraft = existing.find(
            (item) => item.verification_status === 'draft'
          );
          if (resumableDraft) {
            this.hydrateFromReview(resumableDraft);
            this.loadPackagesAndSlots(resumableDraft.listing.id);
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { listingId: resumableDraft.listing.id },
              queryParamsHandling: 'merge',
              replaceUrl: true,
            });
            this.isLoading.set(false);
            return;
          }

          void this.ensureServerDraft()
            .then(() => {
              this.isLoading.set(false);
            })
            .catch(() => {
              this.isLoading.set(false);
            });
        },
      });
  }

  private async ensureServerDraft(): Promise<number> {
    const existing = this.listingId();
    if (existing !== null) {
      return existing;
    }
    if (this.draftCreationPromise) {
      return this.draftCreationPromise;
    }

    this.draftCreationPromise = (async () => {
      try {
        const created = await firstValueFrom(
          this.providerService.createDraftListing('guide')
        );
        this.listingId.set(created.listing.id);
        this.verificationStatus.set(created.verification_status);
        this.isActive.set(Boolean(created.listing.is_active));
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { listingId: created.listing.id },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return created.listing.id;
      } catch (err: any) {
        this.errorMessage.set(
          this.extractErrorMessage(
            err,
            'Could not initialize a server-side guide draft. Verify your approved provider session and retry.'
          )
        );
        throw err;
      } finally {
        this.draftCreationPromise = null;
      }
    })();

    return this.draftCreationPromise;
  }

  private loadExistingDraft(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.providerService
      .getProviderListing(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (review) => {
          if (!review) {
            this.errorMessage.set('Tour guide listing not found or inaccessible.');
            return;
          }
          if (review.listing.category !== 'guide') {
            this.errorMessage.set('Selected listing is not a Tour Guide listing.');
            return;
          }
          this.hydrateFromReview(review);
          this.loadPackagesAndSlots(review.listing.id);
        },
        error: (err) => {
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to load tour guide listing from server.')
          );
        },
      });
  }

  private loadPackagesAndSlots(listingId: number): void {
    this.providerService
      .getGuidePackages(listingId)
      .pipe(catchError(() => of([] as GuidePackageDetails[])))
      .subscribe((pkgs) => {
        if (pkgs.length > 0) {
          this.packages.set(pkgs);
          this.syncDefaultSlotPackage(pkgs);
          this.syncListingPriceFromPackages();
        }
      });

    this.providerService
      .getAvailabilitySlots(listingId, 100, 0)
      .pipe(catchError(() => of([] as AvailabilitySlotResponse[])))
      .subscribe((slots) => {
        this.slots.set(
          [...slots].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        );
      });

    this.providerService
      .getProviderBookings(undefined, 'guide')
      .pipe(catchError(() => of([] as HomestayBookingDetails[])))
      .subscribe((bookings) => {
        this.guideBookings.set(
          bookings.filter((b) => b.listing_id === listingId)
        );
      });
  }

  private hydrateFromReview(review: ReviewListing): void {
    const listing = review.listing;
    const details = review.details || {};
    const guide = (details['guide'] || {}) as Partial<GuideProfileMetadataPayload>;

    this.listingId.set(listing.id);
    this.verificationStatus.set(review.verification_status);
    this.decisionReason.set(review.decision_reason || null);
    this.isActive.set(Boolean(listing.is_active));

    this.guideName = listing.title || '';
    this.professionalTitle = details['contact'] ? String(details['contact']) : '';

    const desc = (listing.description || '').trim();
    const splitIdx = desc.indexOf('\n\n');
    if (splitIdx > 0) {
      this.shortIntro = desc.slice(0, splitIdx).trim();
      this.biography = desc.slice(splitIdx + 2).trim();
    } else {
      this.shortIntro = desc;
      this.biography = '';
    }

    this.yearsOfExperience = Number(guide.years_of_experience) || 0;

    if (details['province']) {
      this.province = String(details['province']);
    }
    if (listing.district) {
      const matchedProv = Object.entries(this.districtsMap).find(([, dists]) =>
        dists.includes(listing.district)
      )?.[0];
      if (matchedProv) this.province = matchedProv;
      this.district = listing.district;
    }
    this.locality = listing.locality || '';
    this.address = details['address'] ? String(details['address']) : '';
    this.meetingPoint = details['house_rules'] ? String(details['house_rules']) : '';
    this.pkgMeetingPoint = this.meetingPoint;

    const lat = Number(listing.latitude);
    const lng = Number(listing.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && listing.latitude != null) {
      this.latitude.set(lat);
      this.longitude.set(lng);
      this.hasExplicitCoordinates = true;
    }

    const parsedPrice = Number(listing.price);
    this.startingPrice =
      !Number.isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : 5000;

    if (Array.isArray(guide.categories) && guide.categories.length > 0) {
      this.selectedBackendCategories = [...guide.categories];
    }
    if (Array.isArray(guide.languages) && guide.languages.length > 0) {
      this.languages = guide.languages.map((l) => ({ ...l }));
    }
    if (Array.isArray(guide.service_areas) && guide.service_areas.length > 0) {
      this.serviceAreas = guide.service_areas.map((a) => ({ ...a }));
    } else {
      this.syncPrimaryServiceArea();
    }
    if (guide.cancellation_policy !== undefined && guide.cancellation_policy !== null) {
      this.cancellationPolicy = String(guide.cancellation_policy);
    }

    if (Array.isArray(details['packages'])) {
      const pkgs = details['packages'] as GuidePackageDetails[];
      this.packages.set(pkgs);
      this.syncDefaultSlotPackage(pkgs);
    }

    const sortedMedia = [...(listing.media || [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    this.photos.set(
      sortedMedia.map((media) => ({
        media,
        url: media.image_url || null,
      }))
    );
    if (!this.isPreview()) {
      for (const media of sortedMedia) {
        if (!media.image_url) {
          this.fetchPhotoPreview(listing.id, media.id);
        }
      }
    }

    const loadedLinks = Array.isArray(details['links']) ? details['links'] : [];
    const loadedNotes = typeof details['notes'] === 'string' ? details['notes'] : '';
    const loadedFiles = Array.isArray(details['files']) ? details['files'] : [];
    this.evidenceLinks.set(loadedLinks);
    this.evidenceNotes.set(loadedNotes);
    this.evidenceFiles.set(loadedFiles);
    this.verificationInitialData.set({
      evidence: { links: loadedLinks, notes: loadedNotes },
      files: loadedFiles,
    });
  }

  private async persistCurrentStep(
    step: number,
    isManualSave = false
  ): Promise<boolean> {
    this.isSaving.set(true);
    try {
      const id = await this.ensureServerDraft();
      const payload = this.buildDraftPatchPayload();
      const updated = await firstValueFrom(
        this.providerService.updateListingDraft(id, payload)
      );
      this.verificationStatus.set(updated.verification_status);
      this.isActive.set(Boolean(updated.listing.is_active));

      if (step === 6 && (!isManualSave || this.evidenceLinks().length > 0 || this.evidenceNotes().trim().length > 0)) {
        await firstValueFrom(
          this.providerService.saveEvidence(id, {
            links: this.evidenceLinks(),
            notes: this.evidenceNotes().trim(),
          })
        );
      }
      return true;
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Failed to save guide changes to server.')
      );
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  private buildDraftPatchPayload(): ListingDraftUpdate {
    this.syncPrimaryServiceArea();
    const basePrice = Math.max(0, Number(this.minimumActivePackagePrice || this.startingPrice) || 0);

    const payload: ListingDraftUpdate = {
      latitude: this.latitude().toFixed(6),
      longitude: this.longitude().toFixed(6),
    };

    if (this.guideName.trim()) {
      payload.title = this.guideName.trim();
    }
    const combinedDesc = this.composeDescription();
    if (combinedDesc) {
      payload.description = combinedDesc;
    }
    if (this.professionalTitle.trim()) {
      payload.contact = this.professionalTitle.trim();
    }
    if (this.province) payload.province = this.province;
    if (this.district) payload.district = this.district;
    if (this.locality.trim()) payload.locality = this.locality.trim();
    if (this.address.trim()) payload.address = this.address.trim();
    if (this.meetingPoint.trim()) payload.house_rules = this.meetingPoint.trim();
    if (basePrice > 0) payload.price = basePrice.toFixed(2);

    payload.guide = {
      years_of_experience: Math.max(0, Math.min(100, Number(this.yearsOfExperience) || 0)),
      categories: [...this.selectedBackendCategories],
      languages: this.languages.map((l) => ({ ...l })),
      service_areas: this.serviceAreas.map((a) => ({
        province: a.province.trim() || this.province,
        district: a.district.trim() || this.district,
        city: a.city.trim(),
        is_primary: a.is_primary,
      })),
      cancellation_policy: this.cancellationPolicy.trim() || null,
    };

    return payload;
  }

  private validateStep(step: number): boolean {
    if (step === 1) {
      if (this.guideName.trim().length < 3) {
        this.errorMessage.set('Guide name must be at least 3 characters.');
        return false;
      }
      if (this.photos().length === 0) {
        this.errorMessage.set('Please upload at least one profile or gallery photograph.');
        return false;
      }
      const desc = this.composeDescription();
      if (this.shortIntro.trim().length < 5 || desc.length < 10) {
        this.errorMessage.set('Provide a short introduction and biography totaling at least 10 characters.');
        return false;
      }
      if (Number(this.yearsOfExperience) < 0 || Number(this.yearsOfExperience) > 100) {
        this.errorMessage.set('Years of experience must be between 0 and 100.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!this.province || !this.district) {
        this.errorMessage.set('Province and district are required.');
        return false;
      }
      if (this.locality.trim().length < 2) {
        this.errorMessage.set('Base locality / town is required.');
        return false;
      }
      if (this.meetingPoint.trim().length < 3) {
        this.errorMessage.set('Primary meeting point must be at least 3 characters.');
        return false;
      }
      if (this.serviceAreas.length === 0) {
        this.errorMessage.set('At least one service area is required.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (this.languages.length === 0) {
        this.errorMessage.set('Select at least one language.');
        return false;
      }
      if (this.selectedBackendCategories.length === 0) {
        this.errorMessage.set('Select at least one guide specialization.');
        return false;
      }
      if (this.startingPrice <= 0 && this.activePackages.length === 0) {
        this.errorMessage.set('Starting price in LKR must be positive.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (this.activePackages.length === 0) {
        this.errorMessage.set(
          'Create at least one active scheduled tour package before proceeding.'
        );
        return false;
      }
      return true;
    }

    return true;
  }

  private syncPrimaryServiceArea(): void {
    const city = this.locality.trim() || this.district;
    const primaryIdx = this.serviceAreas.findIndex((a) => a.is_primary);
    const updatedPrimary: GuideServiceAreaPayload = {
      province: this.province || 'Central',
      district: this.district || 'Kandy',
      city,
      is_primary: true,
    };
    if (primaryIdx === -1) {
      this.serviceAreas = [updatedPrimary, ...this.serviceAreas];
    } else {
      const hasDup = this.serviceAreas.some(
        (a, idx) =>
          idx !== primaryIdx &&
          a.district.toLowerCase() === updatedPrimary.district.toLowerCase() &&
          a.city.toLowerCase() === updatedPrimary.city.toLowerCase()
      );
      if (!hasDup) {
        this.serviceAreas = this.serviceAreas.map((a, idx) =>
          idx === primaryIdx ? updatedPrimary : a
        );
      }
    }
  }

  private syncDefaultSlotPackage(pkgs: GuidePackageDetails[]): void {
    const active = pkgs.filter((p) => p.is_active);
    if (
      active.length > 0 &&
      (!this.selectedSlotPackageId ||
        !active.some((p) => p.id === Number(this.selectedSlotPackageId)))
    ) {
      this.selectedSlotPackageId = active[0].id;
      this.slotCapacity = active[0].max_people;
      this.recomputeEndTimeFromPackage(active[0]);
    }
  }

  private syncListingPriceFromPackages(): void {
    const active = this.activePackages;
    if (active.length === 0) return;
    const min = Math.min(...active.map((p) => Number(p.price) || 0).filter((n) => n > 0));
    if (Number.isFinite(min) && min > 0) {
      this.startingPrice = min;
    }
  }

  private composeDescription(): string {
    const s = this.shortIntro.trim();
    const b = this.biography.trim();
    if (s && b) return `${s}\n\n${b}`;
    return s || b;
  }

  private computeIsoEndTimestamp(startsAtIso: string, durationHours: number): string {
    const startMs = new Date(startsAtIso).getTime();
    const endDate = new Date(startMs + Math.round(durationHours * 3600_000));
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(endDate);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+05:30`;
  }

  private fetchPhotoPreview(listingId: number, photoId: number): void {
    this.providerService.getPhotoBlob(listingId, photoId).subscribe({
      next: (blob) => {
        const prev = this.objectUrls.get(photoId);
        if (prev) URL.revokeObjectURL(prev);
        const objectUrl = URL.createObjectURL(blob);
        this.objectUrls.set(photoId, objectUrl);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
        this.photos.update((curr) =>
          curr.map((p) => (p.media.id === photoId ? { ...p, url: safeUrl } : p))
        );
      },
      error: () => {
        // Fallback placeholder tile
      },
    });
  }

  private syncMediaOrderFromListing(review: ReviewListing): void {
    const sorted = [...(review.listing.media || [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const urlMap = new Map(this.photos().map((p) => [p.media.id, p.url]));
    this.photos.set(
      sorted.map((media) => ({ media, url: urlMap.get(media.id) ?? media.image_url ?? null }))
    );
  }

  private parseSlotDateTimes(
    startsAt: string,
    endsAt: string
  ): { date: string; startTime: string; endTime: string } {
    const formatParts = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) {
        return { date: this.defaultFutureDate(), time: '08:00' };
      }
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
      return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        time: `${get('hour')}:${get('minute')}`,
      };
    };

    const start = formatParts(startsAt);
    const end = formatParts(endsAt);
    return { date: start.date, startTime: start.time, endTime: end.time };
  }

  private defaultFutureDate(): string {
    return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: any) => d?.msg || String(d)).join('; ');
    }
    return err?.message || fallback;
  }

  private showToast(message: string): void {
    this.saveToast.set(message);
    setTimeout(() => {
      if (this.saveToast() === message) {
        this.saveToast.set(null);
      }
    }, 3500);
  }
}
