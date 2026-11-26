import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  EvidenceFileKind,
  EvidenceFileResponse,
  EvidenceLink,
  EvidenceLinkKind,
  EvidenceUpdate,
} from '../../../core/models/provider.models';
import { ProviderService } from '../../../core/services/provider.service';
import { ProviderPreviewService } from '../../../provider/provider-preview.service';

export interface VerificationDataState {
  evidence: EvidenceUpdate;
  files: EvidenceFileResponse[];
}

const HOMESTAY_LINK_OPTIONS: { kind: EvidenceLinkKind; label: string }[] = [
  { kind: 'maps', label: 'Google Maps Profile' },
  { kind: 'airbnb', label: 'Airbnb Listing' },
  { kind: 'booking_com', label: 'Booking.com Listing' },
  { kind: 'instagram', label: 'Instagram Profile' },
  { kind: 'facebook', label: 'Facebook Page' },
  { kind: 'website', label: 'Official Website' },
  { kind: 'video', label: 'YouTube / Video Tour' },
  { kind: 'other', label: 'Other Review Site' },
];

const ADVENTURE_LINK_OPTIONS: { kind: EvidenceLinkKind; label: string }[] = [
  { kind: 'maps', label: 'Google Maps Link' },
  { kind: 'facebook', label: 'Facebook Page' },
  { kind: 'instagram', label: 'Instagram Profile' },
  { kind: 'website', label: 'Business Website' },
  { kind: 'video', label: 'Activity Video Link' },
];

const GUIDE_LINK_OPTIONS: { kind: EvidenceLinkKind; label: string }[] = [
  { kind: 'maps', label: 'Google Maps Link' },
  { kind: 'facebook', label: 'Facebook Page' },
  { kind: 'instagram', label: 'Instagram Profile' },
  { kind: 'website', label: 'Website Link' },
  { kind: 'video', label: 'Introduction / Tour Video Link' },
];

const RENTAL_LINK_OPTIONS: { kind: EvidenceLinkKind; label: string }[] = [
  { kind: 'maps', label: 'Google Maps Pickup Location Link' },
  { kind: 'website', label: 'Business Website' },
  { kind: 'facebook', label: 'Facebook Page' },
  { kind: 'instagram', label: 'Instagram Profile' },
];

const HOMESTAY_FILE_OPTIONS: { kind: EvidenceFileKind; label: string }[] = [
  { kind: 'business_certificate', label: 'Business Registration / Certificate' },
  { kind: 'ownership', label: 'Proof of Ownership / Property Deed' },
  { kind: 'authorization', label: 'Grama Niladhari / Council Authorization' },
  { kind: 'license', label: 'SLTDA / Local Trade License' },
  { kind: 'credentials', label: 'Host Identification (NIC/Passport)' },
  { kind: 'safety', label: 'Fire & Safety Certificate' },
  { kind: 'customer_feedback', label: 'Past Guest Reviews (Redacted Screenshots)' },
  { kind: 'video', label: 'Property Walkthrough Video' },
  { kind: 'other', label: 'Other Verification Proof' },
];

const ADVENTURE_FILE_OPTIONS: { kind: EvidenceFileKind; label: string }[] = [
  { kind: 'safety', label: 'Safety Certificates & Risk Assessments' },
  { kind: 'license', label: 'Relevant Licenses & Qualifications' },
  { kind: 'credentials', label: 'Guide / Operator Credentials' },
  { kind: 'activity_photo', label: 'Activity Photos (Private Evidence)' },
  { kind: 'video', label: 'Activity Video (MP4 up to 25MB)' },
  { kind: 'customer_feedback', label: 'Previous Customer Feedback Screenshots (Redacted)' },
];

const GUIDE_FILE_OPTIONS: { kind: EvidenceFileKind; label: string }[] = [
  { kind: 'license', label: 'Guide License (SLTDA / Provincial License)' },
  { kind: 'credentials', label: 'Professional Qualifications & Certificates' },
  { kind: 'business_certificate', label: 'Registration / Association Certificate' },
  { kind: 'customer_feedback', label: 'Previous Customer Feedback Screenshots (Redacted)' },
  { kind: 'activity_photo', label: 'Supporting Photographs (Private Evidence)' },
  { kind: 'video', label: 'Supporting Video (MP4 up to 25MB)' },
];

const RENTAL_FILE_OPTIONS: { kind: EvidenceFileKind; label: string }[] = [
  { kind: 'vehicle_registration', label: 'Vehicle Registration Certificate' },
  { kind: 'ownership', label: 'Proof of Ownership / Lease Authorization' },
  { kind: 'authorization', label: 'Local Business / Authority Authorization' },
  { kind: 'insurance', label: 'Commercial Rental Insurance Certificate' },
  { kind: 'vehicle_photo', label: 'Private Fleet Inspection / Serial Photos' },
  { kind: 'business_certificate', label: 'Business Registration Certificate' },
  { kind: 'customer_feedback', label: 'Customer Feedback Screenshots (Redacted)' },
];

@Component({
  selector: 'app-service-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-verification.component.html',
  styleUrl: './service-verification.component.scss',
})
export class ServiceVerificationComponent implements OnInit, OnChanges {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);

  readonly isPreview = this.previewService.isPreview;

  @Input() category = 'homestay';
  @Input() listingId: number | null = null;
  @Input() initialData?: Partial<VerificationDataState>;

  @Output() verificationChange = new EventEmitter<VerificationDataState>();

  readonly links = signal<EvidenceLink[]>([
    { kind: 'maps', url: '' },
    { kind: 'booking_com', url: '' },
  ]);

  readonly notes = signal<string>('');
  readonly uploadedFiles = signal<EvidenceFileResponse[]>([]);
  readonly uploadError = signal<string | null>(null);

  // New Link form state
  newLinkKind: EvidenceLinkKind = 'maps';
  newLinkUrl = '';

  // New Document form state
  selectedFileKind: EvidenceFileKind = 'business_certificate';
  isRedacted = false;
  isUploading = false;

  get linkKindOptions(): { kind: EvidenceLinkKind; label: string }[] {
    if (this.category === 'adventure') return ADVENTURE_LINK_OPTIONS;
    if (this.category === 'guide') return GUIDE_LINK_OPTIONS;
    if (this.category === 'bike' || this.category === 'bicycle' || this.category === 'rental') {
      return RENTAL_LINK_OPTIONS;
    }
    return HOMESTAY_LINK_OPTIONS;
  }

  get fileKindOptions(): { kind: EvidenceFileKind; label: string }[] {
    if (this.category === 'adventure') return ADVENTURE_FILE_OPTIONS;
    if (this.category === 'guide') return GUIDE_FILE_OPTIONS;
    if (this.category === 'bike' || this.category === 'bicycle' || this.category === 'rental') {
      return RENTAL_FILE_OPTIONS;
    }
    return HOMESTAY_FILE_OPTIONS;
  }

  get requiresRedactionConfirmation(): boolean {
    return this.selectedFileKind === 'customer_feedback' && !this.isRedacted;
  }

  ngOnInit(): void {
    this.syncDefaults();
    this.applyInitialData(true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category'] && !changes['category'].firstChange) {
      this.syncDefaults();
    }
    if (changes['initialData'] && !changes['initialData'].firstChange) {
      this.applyInitialData(false);
    }
  }

  private syncDefaults(): void {
    if (this.category === 'adventure') {
      this.selectedFileKind = 'safety';
      if (!this.initialData?.evidence?.links?.length) {
        this.links.set([]);
      }
    } else if (this.category === 'guide') {
      this.selectedFileKind = 'license';
      if (!this.initialData?.evidence?.links?.length) {
        this.links.set([]);
      }
    } else if (this.category === 'bike' || this.category === 'bicycle' || this.category === 'rental') {
      this.selectedFileKind = 'vehicle_registration';
      if (!this.initialData?.evidence?.links?.length) {
        this.links.set([]);
      }
    }
  }

  private applyInitialData(emitOnInit: boolean): void {
    if (this.initialData?.evidence?.links) {
      this.links.set([...this.initialData.evidence.links]);
    }
    if (this.initialData?.evidence?.notes !== undefined) {
      this.notes.set(this.initialData.evidence.notes);
    }
    if (this.initialData?.files) {
      this.uploadedFiles.set([...this.initialData.files]);
    }
    if (emitOnInit) {
      this.emitChange();
    }
  }

  onFileKindChange(kind: EvidenceFileKind): void {
    this.selectedFileKind = kind;
    this.uploadError.set(null);
    // Explicit confirmation is required for customer feedback; never auto-mark redacted=true.
    this.isRedacted = false;
  }

  addLink(): void {
    if (this.isPreview() || !this.newLinkUrl.trim()) return;
    this.links.update((current) => [
      ...current,
      { kind: this.newLinkKind, url: this.newLinkUrl.trim() },
    ]);
    this.newLinkUrl = '';
    this.emitChange();
  }

  removeLink(index: number): void {
    if (this.isPreview()) return;
    this.links.update((current) => current.filter((_, i) => i !== index));
    this.emitChange();
  }

  onFileUpload(event: Event): void {
    if (this.isPreview()) {
      this.uploadError.set('Document uploads are disabled in Preview Mode.');
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadError.set(null);

    if (this.selectedFileKind === 'customer_feedback' && !this.isRedacted) {
      this.uploadError.set(
        'Please explicitly confirm that customer personal information has been redacted before uploading feedback screenshots.'
      );
      input.value = '';
      return;
    }

    const maxSizeBytes = this.getMaxFileSize(file);
    if (file.size > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      this.uploadError.set(`File size exceeds limit (${maxMb} MB for this file type).`);
      input.value = '';
      return;
    }

    this.isUploading = true;

    if (this.listingId) {
      this.providerService
        .uploadEvidenceFile(this.listingId, file, this.selectedFileKind, this.isRedacted)
        .subscribe({
          next: (uploaded) => {
            this.uploadedFiles.update((files) => [
              ...files,
              {
                ...uploaded,
                filename: file.name,
                file_size: file.size,
              },
            ]);
            this.isUploading = false;
            this.isRedacted = false;
            input.value = '';
            this.emitChange();
          },
          error: (err) => {
            const detail = err?.error?.detail;
            this.uploadError.set(
              typeof detail === 'string' && detail.trim()
                ? detail
                : err?.message || 'Evidence upload failed.'
            );
            this.isUploading = false;
            input.value = '';
          },
        });
    } else {
      const localItem: EvidenceFileResponse = {
        id: `local-${Date.now()}`,
        kind: this.selectedFileKind,
        media_type: file.type || 'application/pdf',
        redacted: this.selectedFileKind === 'customer_feedback' ? this.isRedacted : null,
        filename: file.name,
        file_size: file.size,
      };
      this.uploadedFiles.update((files) => [...files, localItem]);
      this.isUploading = false;
      this.isRedacted = false;
      input.value = '';
      this.emitChange();
    }
  }

  removeFile(index: number): void {
    if (this.isPreview()) return;
    const file = this.uploadedFiles()[index];
    if (this.listingId && file && !file.id.startsWith('local-')) {
      this.providerService.deleteEvidenceFile(this.listingId, file.id).subscribe({
        next: () => {
          this.uploadedFiles.update((files) => files.filter((_, i) => i !== index));
          this.emitChange();
        },
        error: (err) => {
          const detail = err?.error?.detail;
          this.uploadError.set(
            typeof detail === 'string' && detail.trim() ? detail : 'Could not delete evidence file.'
          );
        },
      });
      return;
    }
    this.uploadedFiles.update((files) => files.filter((_, i) => i !== index));
    this.emitChange();
  }

  onNotesChange(newNotes: string): void {
    this.notes.set(newNotes);
    this.emitChange();
  }

  private getMaxFileSize(file: File): number {
    if (file.type.startsWith('video/') || file.name.endsWith('.mp4')) {
      return 25 * 1024 * 1024;
    }
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return 10 * 1024 * 1024;
    }
    return 5 * 1024 * 1024;
  }

  private emitChange(): void {
    this.verificationChange.emit({
      evidence: {
        links: this.links().filter((l) => l.url.trim().length > 0),
        notes: this.notes(),
      },
      files: this.uploadedFiles(),
    });
  }
}
