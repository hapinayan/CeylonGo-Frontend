import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
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

export interface VerificationDataState {
  evidence: EvidenceUpdate;
  files: EvidenceFileResponse[];
}

@Component({
  selector: 'app-service-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-verification.component.html',
  styleUrl: './service-verification.component.scss',
})
export class ServiceVerificationComponent implements OnInit {
  private readonly providerService = inject(ProviderService);

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

  readonly linkKindOptions: { kind: EvidenceLinkKind; label: string }[] = [
    { kind: 'maps', label: 'Google Maps Profile' },
    { kind: 'airbnb', label: 'Airbnb Listing' },
    { kind: 'booking_com', label: 'Booking.com Listing' },
    { kind: 'instagram', label: 'Instagram Profile' },
    { kind: 'facebook', label: 'Facebook Page' },
    { kind: 'website', label: 'Official Website' },
    { kind: 'video', label: 'YouTube / Video Tour' },
    { kind: 'other', label: 'Other Review Site' },
  ];

  readonly fileKindOptions: { kind: EvidenceFileKind; label: string }[] = [
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

  ngOnInit(): void {
    if (this.initialData?.evidence?.links && this.initialData.evidence.links.length > 0) {
      this.links.set([...this.initialData.evidence.links]);
    }
    if (this.initialData?.evidence?.notes) {
      this.notes.set(this.initialData.evidence.notes);
    }
    if (this.initialData?.files && this.initialData.files.length > 0) {
      this.uploadedFiles.set([...this.initialData.files]);
    }
    this.emitChange();
  }

  onFileKindChange(kind: EvidenceFileKind): void {
    this.selectedFileKind = kind;
    // Automatically flag redacted=true for customer feedback screenshots per compliance requirements
    if (kind === 'customer_feedback') {
      this.isRedacted = true;
    }
  }

  addLink(): void {
    if (!this.newLinkUrl.trim()) return;
    this.links.update((current) => [
      ...current,
      { kind: this.newLinkKind, url: this.newLinkUrl.trim() },
    ]);
    this.newLinkUrl = '';
    this.emitChange();
  }

  removeLink(index: number): void {
    this.links.update((current) => current.filter((_, i) => i !== index));
    this.emitChange();
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadError.set(null);

    // Validate upload limits
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
            input.value = '';
            this.emitChange();
          },
          error: (err) => {
            this.uploadError.set(err.message || 'Evidence upload failed.');
            this.isUploading = false;
            input.value = '';
          },
        });
    } else {
      // Local preview before draft creation
      const mockItem: EvidenceFileResponse = {
        id: `local-${Date.now()}`,
        kind: this.selectedFileKind,
        media_type: file.type || 'application/pdf',
        redacted: this.isRedacted,
        filename: file.name,
        file_size: file.size,
      };
      this.uploadedFiles.update((files) => [...files, mockItem]);
      this.isUploading = false;
      input.value = '';
      this.emitChange();
    }
  }

  removeFile(index: number): void {
    const file = this.uploadedFiles()[index];
    if (this.listingId && file && !file.id.startsWith('local-')) {
      this.providerService.deleteEvidenceFile(this.listingId, file.id).subscribe();
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
      return 25 * 1024 * 1024; // 25 MB
    }
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      return 10 * 1024 * 1024; // 10 MB
    }
    return 5 * 1024 * 1024; // 5 MB for JPEG, PNG, WebP
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
