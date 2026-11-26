import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import {
  PROVIDER_CATEGORY_DISPLAY_NAMES,
  ProviderCategory,
  ProviderDetailResponse,
} from '../../../../core/models/admin-providers.models';

@Component({
  selector: 'app-admin-provider-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="modal-backdrop"
      (click)="onBackdropClick($event)"
      role="presentation"
    >
      <div
        class="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-modal-title"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <header class="modal-header">
          <div class="header-left">
            <span class="provider-id-badge">Provider #{{ provider?.id }}</span>
            <h2 id="provider-modal-title" class="modal-title">
              {{ provider?.business_name || 'Provider Application' }}
            </h2>
            <div class="badge-row">
              <span
                class="status-pill"
                [ngClass]="provider?.approval_status || 'pending'"
              >
                {{ provider?.approval_status | titlecase }}
              </span>
              <span class="category-pill">
                {{ getCategoryLabel(provider?.provider_type) }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="close-button"
            (click)="close.emit()"
            aria-label="Close provider details dialog"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <!-- Rejection Alert Banner (if rejected) -->
        <div *ngIf="provider?.approval_status === 'rejected' && provider?.rejection_reason" class="rejection-alert">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="alert-content">
            <span class="alert-label">Application Rejected:</span>
            <p class="alert-reason">{{ provider?.rejection_reason }}</p>
          </div>
        </div>

        <!-- Modal Body / Two Column Details -->
        <div class="modal-body">
          <!-- Section 1: Business Profile -->
          <section class="details-section">
            <h3 class="section-title">Business & Operation Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="item-label">Business Name</span>
                <span class="item-value bold">{{ provider?.business_name || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Service Category</span>
                <span class="item-value">{{ getCategoryLabel(provider?.provider_type) }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Operational District</span>
                <span class="item-value">{{ provider?.district || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Business Reg. Number</span>
                <span class="item-value monospace">{{ provider?.business_registration_number || 'Not Registered' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Secondary / Business Phone</span>
                <span class="item-value">{{ provider?.secondary_phone || '—' }}</span>
              </div>
              <div class="info-item full-width" *ngIf="provider?.description">
                <span class="item-label">Business Description</span>
                <p class="description-text">{{ provider?.description }}</p>
              </div>
            </div>
          </section>

          <!-- Section 2: Personal & Contact Information -->
          <section class="details-section">
            <h3 class="section-title">Applicant & Personal Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="item-label">Full Name</span>
                <span class="item-value bold">{{ provider?.full_name || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Email Address</span>
                <span class="item-value">{{ provider?.email || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Primary Phone</span>
                <span class="item-value">{{ provider?.phone || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">NIC / Identity Number</span>
                <span class="item-value monospace">{{ provider?.nic_number || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Date of Birth</span>
                <span class="item-value">{{ provider?.date_of_birth ? (provider?.date_of_birth | date:'mediumDate') : '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Gender & Nationality</span>
                <span class="item-value">{{ (provider?.gender || '—') + ' / ' + (provider?.nationality || 'Sri Lankan') }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Account Status</span>
                <span class="item-value">
                  <span class="dot" [ngClass]="provider?.is_active ? 'active-dot' : 'inactive-dot'"></span>
                  {{ provider?.is_active ? 'Active User' : 'Inactive User' }}
                </span>
              </div>
            </div>
          </section>

          <!-- Section 3: Addresses -->
          <section class="details-section">
            <h3 class="section-title">Registered Addresses</h3>
            <div class="address-grid">
              <div class="address-card">
                <span class="address-title">Business Location</span>
                <p class="address-lines">
                  {{ provider?.business_city || provider?.district }}
                  <span *ngIf="provider?.business_district">, {{ provider?.business_district }}</span>
                  <span *ngIf="provider?.business_province">, {{ provider?.business_province }} Province</span>
                  <span *ngIf="provider?.business_postal_code"> ({{ provider?.business_postal_code }})</span>
                </p>
                <span *ngIf="provider?.business_landmark" class="landmark-text">
                  Landmark: {{ provider?.business_landmark }}
                </span>
              </div>
              <div class="address-card">
                <span class="address-title">Permanent Residential Address</span>
                <p class="address-lines">
                  {{ provider?.permanent_city || '—' }}
                  <span *ngIf="provider?.permanent_district">, {{ provider?.permanent_district }}</span>
                  <span *ngIf="provider?.permanent_province">, {{ provider?.permanent_province }} Province</span>
                  <span *ngIf="provider?.permanent_postal_code"> ({{ provider?.permanent_postal_code }})</span>
                </p>
                <span *ngIf="provider?.permanent_landmark" class="landmark-text">
                  Landmark: {{ provider?.permanent_landmark }}
                </span>
              </div>
            </div>
          </section>

          <!-- Section 4: Safe Document Availability Status -->
          <section class="details-section documents-section">
            <h3 class="section-title">Identity & Verification Document Status</h3>
            <p class="docs-notice">
              Safe availability indicators are shown below. Full document inspection and verification decisions are managed under the Verification Management module (Phase 02D).
            </p>
            <div class="docs-grid">
              <div class="doc-status-card" [class.available]="provider?.selfie_uploaded">
                <div class="doc-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
                <div class="doc-info">
                  <span class="doc-name">Live Selfie Photo</span>
                  <span class="doc-flag" [class.uploaded]="provider?.selfie_uploaded">
                    {{ provider?.selfie_uploaded ? 'Available / Uploaded' : 'Missing' }}
                  </span>
                </div>
              </div>

              <div class="doc-status-card" [class.available]="provider?.nic_front_uploaded">
                <div class="doc-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <line x1="6" y1="8" x2="10" y2="8"></line>
                    <line x1="6" y1="12" x2="14" y2="12"></line>
                  </svg>
                </div>
                <div class="doc-info">
                  <span class="doc-name">NIC / Passport Front</span>
                  <span class="doc-flag" [class.uploaded]="provider?.nic_front_uploaded">
                    {{ provider?.nic_front_uploaded ? 'Available / Uploaded' : 'Missing' }}
                  </span>
                </div>
              </div>

              <div class="doc-status-card" [class.available]="provider?.nic_back_uploaded">
                <div class="doc-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <line x1="6" y1="8" x2="18" y2="8"></line>
                    <line x1="6" y1="12" x2="18" y2="12"></line>
                    <line x1="6" y1="16" x2="12" y2="16"></line>
                  </svg>
                </div>
                <div class="doc-info">
                  <span class="doc-name">NIC Back (if applicable)</span>
                  <span class="doc-flag" [class.uploaded]="provider?.nic_back_uploaded">
                    {{ provider?.nic_back_uploaded ? 'Available / Uploaded' : 'Not Provided' }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 5: Audit & History -->
          <section class="details-section audit-section">
            <h3 class="section-title">Application Audit Trail</h3>
            <div class="audit-grid">
              <div class="audit-item">
                <span class="audit-label">Submitted On</span>
                <span class="audit-val">{{ provider?.created_at ? (provider?.created_at | date:'medium') : '—' }}</span>
              </div>
              <div class="audit-item" *ngIf="provider?.reviewed_at">
                <span class="audit-label">Reviewed On</span>
                <span class="audit-val">{{ provider?.reviewed_at | date:'medium' }}</span>
              </div>
              <div class="audit-item" *ngIf="provider?.reviewer_name">
                <span class="audit-label">Reviewed By</span>
                <span class="audit-val">{{ provider?.reviewer_name }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- Modal Footer -->
        <footer class="modal-footer">
          <button type="button" class="btn-secondary" (click)="close.emit()">
            Close
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        padding: 1rem;
        overflow-y: auto;
      }

      .modal-card {
        background: #ffffff;
        border-radius: 12px;
        width: 100%;
        max-width: 780px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }

      .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        background-color: #f8fafc;
      }

      .header-left {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .provider-id-badge {
        font-family: monospace;
        font-size: 0.75rem;
        font-weight: 600;
        color: #0369a1;
        background-color: #e0f2fe;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        align-self: flex-start;
      }

      .modal-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f2c59;
        margin: 0;
      }

      .badge-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }

      .status-pill {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        text-transform: capitalize;
      }

      .status-pill.approved {
        background-color: #dcfce7;
        color: #15803d;
      }

      .status-pill.pending {
        background-color: #fef3c7;
        color: #b45309;
      }

      .status-pill.rejected {
        background-color: #fee2e2;
        color: #b91c1c;
      }

      .category-pill {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        background-color: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
      }

      .close-button {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.4rem;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .close-button:hover {
        background-color: #e2e8f0;
        color: #0f172a;
      }

      .rejection-alert {
        display: flex;
        gap: 0.75rem;
        padding: 0.85rem 1.25rem;
        background-color: #fef2f2;
        border-bottom: 1px solid #fecaca;
        color: #991b1b;
        align-items: flex-start;
      }

      .alert-icon {
        flex-shrink: 0;
        margin-top: 0.1rem;
      }

      .alert-content {
        font-size: 0.875rem;
      }

      .alert-label {
        font-weight: 700;
        display: block;
        margin-bottom: 0.2rem;
      }

      .alert-reason {
        margin: 0;
        line-height: 1.4;
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .details-section {
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 1.25rem;
      }

      .details-section:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .section-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f2c59;
        margin: 0 0 0.85rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .info-item.full-width {
        grid-column: 1 / -1;
      }

      .item-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .item-value {
        font-size: 0.875rem;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .item-value.bold {
        font-weight: 600;
      }

      .item-value.monospace {
        font-family: monospace;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }

      .active-dot {
        background-color: #22c55e;
      }

      .inactive-dot {
        background-color: #94a3b8;
      }

      .description-text {
        margin: 0;
        font-size: 0.875rem;
        color: #334155;
        line-height: 1.5;
        background-color: #f8fafc;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }

      .address-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }

      .address-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .address-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: #0f2c59;
      }

      .address-lines {
        margin: 0;
        font-size: 0.85rem;
        color: #334155;
        line-height: 1.4;
      }

      .landmark-text {
        font-size: 0.75rem;
        color: #64748b;
        font-style: italic;
      }

      .docs-notice {
        font-size: 0.8rem;
        color: #64748b;
        margin: 0 0 0.85rem 0;
        line-height: 1.4;
      }

      .docs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
      }

      .doc-status-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }

      .doc-status-card.available {
        border-color: #cbd5e1;
        background-color: #f8fafc;
      }

      .doc-icon {
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .doc-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .doc-name {
        font-size: 0.8rem;
        font-weight: 600;
        color: #1e293b;
      }

      .doc-flag {
        font-size: 0.725rem;
        color: #94a3b8;
        font-weight: 500;
      }

      .doc-flag.uploaded {
        color: #16a34a;
        font-weight: 600;
      }

      .audit-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        background-color: #f8fafc;
        padding: 0.85rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }

      .audit-item {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .audit-label {
        font-size: 0.725rem;
        color: #64748b;
        text-transform: uppercase;
      }

      .audit-val {
        font-size: 0.825rem;
        color: #1e293b;
        font-weight: 500;
      }

      .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        background-color: #f8fafc;
      }

      .btn-secondary {
        padding: 0.5rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary:hover {
        background-color: #f1f5f9;
        color: #0f172a;
      }
    `,
  ],
})
export class AdminProviderDetailModalComponent {
  @Input() provider: ProviderDetailResponse | null = null;
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  getCategoryLabel(type?: string): string {
    if (!type) return 'Service Provider';
    return PROVIDER_CATEGORY_DISPLAY_NAMES[type as ProviderCategory] || type;
  }
}
