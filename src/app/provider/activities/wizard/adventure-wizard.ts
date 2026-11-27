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
import { finalize, firstValueFrom } from 'rxjs';
import {
  ACTIVITY_CATEGORIES,
  ActivityCategorySlug,
  ActivityMetadataPayload,
  AvailabilitySlotCreate,
  AvailabilitySlotResponse,
  EvidenceFileResponse,
  EvidenceLink,
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
  selector: 'app-adventure-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LocationPickerComponent,
    ServiceVerificationComponent,
  ],
  templateUrl: './adventure-wizard.html',
  styleUrl: './adventure-wizard.scss',
})
export class AdventureWizard implements OnInit, OnDestroy {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;

  readonly steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Location & Meeting' },
    { num: 3, label: 'Photos & Details' },
    { num: 4, label: 'Pricing & Slots' },
    { num: 5, label: 'Safety & Policy' },
    { num: 6, label: 'Verification' },
  ];

  readonly categories = ACTIVITY_CATEGORIES;

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
  readonly unitId = signal<number | null>(null);
  readonly verificationStatus = signal<VerificationStatus>('draft');
  readonly decisionReason = signal<string | null>(null);
  readonly isActive = signal<boolean>(false);

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isSubmitted = signal<boolean>(false);
  readonly isUploadingPhoto = signal<boolean>(false);
  readonly isSavingSlot = signal<boolean>(false);

  readonly errorMessage = signal<string | null>(null);
  readonly slotErrorMessage = signal<string | null>(null);
  readonly saveToast = signal<string | null>(null);

  readonly isSuspended = computed(() => this.verificationStatus() === 'suspended');

  // Step 1 — Basic Info
  title = '';
  activityCategory: ActivityCategorySlug = 'hiking-trekking';
  shortDescription = '';
  detailedDescription = '';
  durationMinutes = 120;

  // Step 2 — Location & Meeting Point
  province = 'Central';
  district = 'Kandy';
  locality = '';
  address = '';
  meetingPoint = '';
  readonly latitude = signal<number>(7.2906);
  readonly longitude = signal<number>(80.6337);
  hasExplicitCoordinates = false;

  // Step 3 — Photos & Activity Info
  readonly photos = signal<PhotoPreview[]>([]);
  highlights: string[] = [];
  newHighlight = '';
  included: string[] = [];
  newIncluded = '';
  excluded: string[] = [];
  newExcluded = '';
  equipment = '';
  facilities = '';

  // Step 4 — Pricing & Availability
  price = 8500;
  minParticipants = 1;
  maxParticipants = 8;
  readonly slots = signal<AvailabilitySlotResponse[]>([]);
  editingSlotId: number | null = null;
  slotDate = this.defaultFutureDate();
  slotStartTime = '08:00';
  slotEndTime = '11:00';
  slotCapacity = 8;
  slotIsOpen = true;

  // Step 5 — Safety & Restrictions
  minimumAge: number | null = null;
  safetyInstructions = '';
  restrictions = '';
  cancellationPolicy = '';

  // Step 6 — Verification & Submission
  readonly evidenceLinks = signal<EvidenceLink[]>([]);
  readonly evidenceNotes = signal<string>('');
  readonly evidenceFiles = signal<EvidenceFileResponse[]>([]);
  readonly verificationInitialData = signal<Partial<VerificationDataState> | undefined>(undefined);
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
              (l) => l.listing.id === requestedId && l.listing.category === 'adventure'
            )
          : undefined) ??
        this.previewService.sampleListings.find((l) => l.listing.category === 'adventure');

      if (sample) {
        this.hydrateFromReview(sample);
        this.slots.set(this.previewService.sampleSlotsMap[sample.listing.id] ?? []);
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
      this.errorMessage.set('Invalid activity listing identifier.');
      this.isLoading.set(false);
      return;
    }

    this.initializeServerDraft();
  }

  ngOnDestroy(): void {
    for (const objectUrl of this.objectUrls.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    this.objectUrls.clear();
  }

  get availableDistricts(): string[] {
    return this.districtsMap[this.province] || [];
  }

  get categoryLabel(): string {
    return (
      this.categories.find((c) => c.slug === this.activityCategory)?.label ||
      this.activityCategory
    );
  }

  get formattedDuration(): string {
    const mins = Number(this.durationMinutes) || 0;
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`;
  }

  get hasSafetyEvidence(): boolean {
    const hasSafetyFile = this.evidenceFiles().some((f) => f.kind === 'safety');
    return hasSafetyFile || this.evidenceNotes().trim().length > 0;
  }

  get hasCoverPhoto(): boolean {
    return this.photos().length > 0;
  }

  onProvinceChange(): void {
    const allowed = this.availableDistricts;
    if (allowed.length > 0 && !allowed.includes(this.district)) {
      this.district = allowed[0];
    }
  }

  onCoordinatesChange(coords: { lat: number; lng: number }): void {
    this.latitude.set(Number(coords.lat.toFixed(6)));
    this.longitude.set(Number(coords.lng.toFixed(6)));
    this.hasExplicitCoordinates = true;
  }

  retryDraftInitialization(): void {
    this.errorMessage.set(null);
    const id = this.listingId();
    if (id) {
      this.loadExistingDraft(id);
    } else {
      this.initializeServerDraft();
    }
  }

  goToStep(stepNum: number): void {
    if (stepNum < 1 || stepNum > 6) return;
    if (stepNum < this.currentStep()) {
      this.errorMessage.set(null);
      this.currentStep.set(stepNum);
      return;
    }
    if (stepNum === this.currentStep()) return;

    // Allow forward navigation step-by-step via validation
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
      if (step < 6) this.currentStep.set(step + 1);
      return;
    }

    const saved = await this.persistCurrentStep(step);
    if (!saved) {
      return;
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
      this.showToast('Draft progress saved on server.');
    }
  }

  // --- Step 3 List Builders ---
  addListItem(
    target: 'highlights' | 'included' | 'excluded',
    value: string
  ): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!this[target].includes(trimmed)) {
      this[target] = [...this[target], trimmed];
    }
    if (target === 'highlights') this.newHighlight = '';
    if (target === 'included') this.newIncluded = '';
    if (target === 'excluded') this.newExcluded = '';
  }

  removeListItem(
    target: 'highlights' | 'included' | 'excluded',
    index: number
  ): void {
    this[target] = this[target].filter((_, idx) => idx !== index);
  }

  // --- Step 3 Photos ---
  async onPhotoSelected(event: Event): Promise<void> {
    if (this.isPreview()) {
      this.errorMessage.set('Photo uploads are disabled in Preview Mode.');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.errorMessage.set(null);
    const files = Array.from(input.files);
    input.value = '';

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
          this.providerService.uploadPhoto(id, file, this.title.trim() || file.name)
        );
        this.photos.update((curr) => [...curr, { media: uploaded, url: null }]);
        this.fetchPhotoPreview(id, uploaded.id);
      }
      this.showToast('Photos uploaded.');
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Failed to upload one or more photos.')
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
      this.showToast('Cover photo updated.');
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Could not update cover photo.')
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
        this.extractErrorMessage(err, 'Failed to delete photo.')
      );
    }
  }

  // --- Step 4 Availability Slots ---
  startEditSlot(slot: AvailabilitySlotResponse): void {
    this.slotErrorMessage.set(null);
    this.editingSlotId = slot.id;
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
    this.slotCapacity = this.maxParticipants;
    this.slotIsOpen = true;
  }

  async saveSlot(): Promise<void> {
    this.slotErrorMessage.set(null);
    if (this.isPreview()) {
      this.slotErrorMessage.set('Slot changes are disabled in Preview Mode.');
      return;
    }
    if (this.isSuspended()) {
      this.slotErrorMessage.set('Suspended listings cannot modify slots.');
      return;
    }

    if (!this.slotDate || !this.slotStartTime || !this.slotEndTime) {
      this.slotErrorMessage.set('Please select a date, start time, and end time.');
      return;
    }

    const startsAt = `${this.slotDate}T${this.slotStartTime}:00+05:30`;
    const endsAt = `${this.slotDate}T${this.slotEndTime}:00+05:30`;

    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      this.slotErrorMessage.set('End time must be after start time.');
      return;
    }
    if (new Date(startsAt).getTime() <= Date.now()) {
      this.slotErrorMessage.set('Slot start time must be in the future.');
      return;
    }

    const cap = Number(this.slotCapacity);
    const minP = Number(this.minParticipants);
    const maxP = Number(this.maxParticipants);
    if (this.slotIsOpen && (cap < minP || cap > maxP)) {
      this.slotErrorMessage.set(
        `Open slot capacity must be between ${minP} and ${maxP} participants.`
      );
      return;
    }
    if (cap < 1) {
      this.slotErrorMessage.set('Slot capacity must be at least 1.');
      return;
    }

    this.isSavingSlot.set(true);
    try {
      const id = await this.ensureUnitReady();
      const unitId = this.unitId();
      if (!unitId) {
        this.slotErrorMessage.set(
          'Complete Basic Info, Location & Meeting Point before creating availability slots.'
        );
        return;
      }

      const payload: AvailabilitySlotCreate = {
        unit_id: unitId,
        starts_at: startsAt,
        ends_at: endsAt,
        capacity: cap,
        is_open: this.slotIsOpen,
      };

      if (this.editingSlotId !== null) {
        const updated = await firstValueFrom(
          this.providerService.updateAvailabilitySlot(id, this.editingSlotId, payload)
        );
        this.slots.update((curr) =>
          curr.map((item) => (item.id === updated.id ? updated : item))
        );
        this.editingSlotId = null;
        this.showToast('Time slot updated.');
      } else {
        const created = await firstValueFrom(
          this.providerService.addAvailabilitySlot(id, payload)
        );
        this.slots.update((curr) =>
          [...curr, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        );
        this.showToast('Time slot added.');
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
    if (!id || this.isSuspended() || this.isPreview()) return;
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
        curr.map((item) => (item.id === updated.id ? updated : item))
      );
      this.showToast(updated.is_open ? 'Slot reopened.' : 'Slot blocked.');
    } catch (err: any) {
      this.slotErrorMessage.set(
        this.extractErrorMessage(err, 'Could not update slot availability.')
      );
    } finally {
      this.isSavingSlot.set(false);
    }
  }

  // --- Step 6 Verification Handlers ---
  onVerificationChange(state: VerificationDataState): void {
    this.evidenceLinks.set(state.evidence.links || []);
    this.evidenceNotes.set(state.evidence.notes || '');
    this.evidenceFiles.set(state.files || []);
  }

  async submitForVerification(): Promise<void> {
    this.errorMessage.set(null);
    if (this.isPreview()) {
      this.errorMessage.set('Submitting listings is disabled in Preview Mode.');
      return;
    }
    if (this.isSuspended()) {
      this.errorMessage.set('Suspended listings cannot be submitted.');
      return;
    }

    for (let step = 1; step <= 5; step++) {
      if (!this.validateStep(step)) {
        this.currentStep.set(step);
        return;
      }
    }

    if (!this.hasSafetyEvidence) {
      this.errorMessage.set(
        'Please upload at least one Safety Certificate file OR add verification notes explaining your safety measures.'
      );
      return;
    }

    if (!this.declarationAccepted) {
      this.errorMessage.set(
        'Please confirm the accuracy and safety compliance declaration before submitting.'
      );
      return;
    }

    this.isSubmitting.set(true);
    try {
      const saved = await this.persistCurrentStep(5, false, true);
      if (!saved) {
        return;
      }
      const id = this.listingId()!;
      await firstValueFrom(
        this.providerService.saveEvidence(id, {
          links: this.evidenceLinks(),
          notes: this.evidenceNotes().trim(),
        })
      );
      const submitted = await firstValueFrom(
        this.providerService.submitListing(id)
      );
      this.verificationStatus.set(submitted.verification_status);
      this.isSubmitted.set(true);
    } catch (err: any) {
      this.errorMessage.set(
        this.extractErrorMessage(err, 'Failed to submit listing for verification.')
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

  // --- Internal Server Draft Sync Helpers ---
  private initializeServerDraft(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    void this.ensureServerDraft()
      .then(() => {
        this.isLoading.set(false);
      })
      .catch(() => {
        this.isLoading.set(false);
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
          this.providerService.createDraftListing('adventure')
        );
        this.listingId.set(created.listing.id);
        this.verificationStatus.set(created.verification_status);
        this.isActive.set(Boolean(created.listing.is_active));
        if (created.listing.units && created.listing.units.length > 0) {
          this.unitId.set(created.listing.units[0].id);
        }
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
            'Could not initialize a server draft. Please verify your provider session and retry.'
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
            this.errorMessage.set('Listing not found or inaccessible.');
            return;
          }
          if (review.listing.category !== 'adventure') {
            this.errorMessage.set('Selected listing is not an Adventure & Activities listing.');
            return;
          }
          this.hydrateFromReview(review);
          this.loadSlotsForListing(review.listing.id);
        },
        error: (err) => {
          this.errorMessage.set(
            this.extractErrorMessage(err, 'Failed to load activity draft from server.')
          );
        },
      });
  }

  private hydrateFromReview(review: ReviewListing): void {
    const listing = review.listing;
    const details = review.details || {};
    const activity = (details['activity'] || {}) as Partial<ActivityMetadataPayload>;

    this.listingId.set(listing.id);
    this.verificationStatus.set(review.verification_status);
    this.decisionReason.set(review.decision_reason || null);
    this.isActive.set(Boolean(listing.is_active));

    if (listing.units && listing.units.length > 0) {
      this.unitId.set(listing.units[0].id);
    }

    this.title = listing.title || '';
    const desc = (listing.description || '').trim();
    const doubleBreak = desc.indexOf('\n\n');
    if (doubleBreak > 0) {
      this.shortDescription = desc.slice(0, doubleBreak).trim();
      this.detailedDescription = desc.slice(doubleBreak + 2).trim();
    } else {
      this.shortDescription = desc;
      this.detailedDescription = '';
    }

    if (activity.category) {
      this.activityCategory = activity.category;
    }
    this.durationMinutes = Number(activity.duration_minutes) || 120;

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
    this.meetingPoint = activity.meeting_point || '';

    const lat = Number(listing.latitude);
    const lng = Number(listing.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && listing.latitude != null) {
      this.latitude.set(lat);
      this.longitude.set(lng);
      this.hasExplicitCoordinates = true;
    }

    const parsedPrice = Number(listing.price);
    this.price = !Number.isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : 8500;

    this.minParticipants = Number(activity.min_participants) || 1;
    this.maxParticipants = Number(activity.max_participants) || 8;
    this.slotCapacity = this.maxParticipants;

    this.highlights = Array.isArray(activity.highlights) ? [...activity.highlights] : [];
    this.included = Array.isArray(activity.included) ? [...activity.included] : [];
    this.excluded = Array.isArray(activity.excluded) ? [...activity.excluded] : [];
    this.equipment = activity.equipment || '';
    this.facilities = activity.facilities || '';
    this.minimumAge =
      activity.minimum_age !== undefined && activity.minimum_age !== null
        ? Number(activity.minimum_age)
        : null;
    this.safetyInstructions = activity.safety_instructions || '';
    this.restrictions = activity.restrictions || '';
    this.cancellationPolicy = activity.cancellation_policy || '';

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

  private loadSlotsForListing(listingId: number): void {
    this.providerService.getAvailabilitySlots(listingId).subscribe({
      next: (slots) => {
        const sorted = [...slots].sort((a, b) =>
          a.starts_at.localeCompare(b.starts_at)
        );
        this.slots.set(sorted);
      },
      error: () => {
        // Non-fatal on draft load; slot section will still allow adding
      },
    });
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
        // Keep placeholder tile if blob preview cannot be fetched
      },
    });
  }

  private syncMediaOrderFromListing(review: ReviewListing): void {
    const sorted = [...(review.listing.media || [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    const urlMap = new Map(this.photos().map((p) => [p.media.id, p.url]));
    this.photos.set(
      sorted.map((media) => ({ media, url: urlMap.get(media.id) ?? null }))
    );
  }

  private validateStep(step: number): boolean {
    if (step === 1) {
      if (this.title.trim().length < 3) {
        this.errorMessage.set('Activity name must be at least 3 characters.');
        return false;
      }
      if (!this.activityCategory) {
        this.errorMessage.set('Please select an activity category.');
        return false;
      }
      const combined = this.composeDescription();
      if (this.shortDescription.trim().length < 5 || combined.length < 10) {
        this.errorMessage.set(
          'Please provide a short description and at least 10 characters total describing the activity.'
        );
        return false;
      }
      if (!this.durationMinutes || Number(this.durationMinutes) < 1) {
        this.errorMessage.set('Duration must be at least 1 minute.');
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
        this.errorMessage.set('Activity location / town is required.');
        return false;
      }
      if (this.meetingPoint.trim().length < 1) {
        this.errorMessage.set('Meeting point is required.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (this.photos().length === 0) {
        this.errorMessage.set('Please upload at least one activity photograph.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (!this.price || Number(this.price) <= 0) {
        this.errorMessage.set('Price per participant must be greater than LKR 0.');
        return false;
      }
      const minP = Number(this.minParticipants);
      const maxP = Number(this.maxParticipants);
      if (minP < 1 || maxP < 1 || minP > maxP) {
        this.errorMessage.set(
          'Minimum participants must be at least 1 and cannot exceed maximum participants.'
        );
        return false;
      }
      return true;
    }

    if (step === 5) {
      if (this.safetyInstructions.trim().length < 5) {
        this.errorMessage.set(
          'Safety instructions are required before submitting your activity.'
        );
        return false;
      }
      if (
        this.minimumAge !== null &&
        this.minimumAge !== undefined &&
        String(this.minimumAge) !== '' &&
        (Number(this.minimumAge) < 0 || Number(this.minimumAge) > 99)
      ) {
        this.errorMessage.set('Minimum age must be between 0 and 99.');
        return false;
      }
      return true;
    }

    return true;
  }

  private async ensureUnitReady(): Promise<number> {
    const id = await this.ensureServerDraft();
    if (this.unitId() !== null) {
      return id;
    }
    if (this.meetingPoint.trim().length < 1) {
      throw new Error('Missing meeting point');
    }
    const payload = this.buildDraftPatchPayload(true);
    const updated = await firstValueFrom(
      this.providerService.updateListingDraft(id, payload)
    );
    if (updated.listing.units && updated.listing.units.length > 0) {
      this.unitId.set(updated.listing.units[0].id);
    }
    return id;
  }

  private async persistCurrentStep(
    step: number,
    isManualSave = false,
    includeEvidence = false
  ): Promise<boolean> {
    this.isSaving.set(true);
    try {
      const id = await this.ensureServerDraft();
      const canIncludeActivity = this.meetingPoint.trim().length > 0;
      const payload = this.buildDraftPatchPayload(canIncludeActivity);

      if (Object.keys(payload).length > 0) {
        const updated = await firstValueFrom(
          this.providerService.updateListingDraft(id, payload)
        );
        this.verificationStatus.set(updated.verification_status);
        this.isActive.set(Boolean(updated.listing.is_active));
        if (updated.listing.units && updated.listing.units.length > 0) {
          this.unitId.set(updated.listing.units[0].id);
        }
      }

      if ((step === 6 || includeEvidence) && !isManualSave) {
        await firstValueFrom(
          this.providerService.saveEvidence(id, {
            links: this.evidenceLinks(),
            notes: this.evidenceNotes().trim(),
          })
        );
      } else if (step === 6 && isManualSave) {
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
        this.extractErrorMessage(err, 'Failed to save changes to server.')
      );
      return false;
    } finally {
      this.isSaving.set(false);
    }
  }

  private buildDraftPatchPayload(includeActivity: boolean): ListingDraftUpdate {
    const payload: ListingDraftUpdate = {};

    const cleanTitle = this.title.trim();
    if (cleanTitle.length > 0) {
      payload.title = cleanTitle;
    }

    const combinedDescription = this.composeDescription();
    if (combinedDescription.length > 0) {
      payload.description = combinedDescription;
    }

    if (this.province) {
      payload.province = this.province;
    }
    if (this.district) {
      payload.district = this.district;
    }
    if (this.locality.trim()) {
      payload.locality = this.locality.trim();
    }
    if (this.address.trim()) {
      payload.address = this.address.trim();
    }

    if (this.hasExplicitCoordinates || this.currentStep() >= 2) {
      payload.latitude = this.latitude();
      payload.longitude = this.longitude();
    }

    if (Number(this.price) > 0) {
      payload.price = Number(this.price);
    }

    if (includeActivity) {
      const minP = Math.max(1, Number(this.minParticipants) || 1);
      const maxP = Math.max(minP, Number(this.maxParticipants) || minP);
      const rawAge =
        this.minimumAge !== null &&
        this.minimumAge !== undefined &&
        String(this.minimumAge) !== ''
          ? Number(this.minimumAge)
          : null;

      payload.activity = {
        category: this.activityCategory,
        meeting_point: this.meetingPoint.trim(),
        duration_minutes: Math.max(1, Number(this.durationMinutes) || 60),
        min_participants: minP,
        max_participants: maxP,
        minimum_age: rawAge,
        highlights: this.highlights,
        included: this.included,
        excluded: this.excluded,
        equipment: this.equipment.trim() || null,
        facilities: this.facilities.trim() || null,
        safety_instructions: this.safetyInstructions.trim() || null,
        restrictions: this.restrictions.trim() || null,
        cancellation_policy: this.cancellationPolicy.trim() || null,
      };
    }

    return payload;
  }

  private composeDescription(): string {
    const shortPart = this.shortDescription.trim();
    const detailPart = this.detailedDescription.trim();
    if (shortPart && detailPart) {
      return `${shortPart}\n\n${detailPart}`;
    }
    return shortPart || detailPart;
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
      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value || '00';
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
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
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
