import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

import { HomestayResponse } from '../../../../core/models/admin-homestays.models';

@Component({
  selector: 'app-admin-homestay-detail-modal',
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
        aria-labelledby="homestay-modal-title"
        (click)="$event.stopPropagation()"
      >
        <!-- Modal Header -->
        <header class="modal-header">
          <div class="header-left">
            <span class="homestay-id-badge">Homestay #{{ homestay?.id }}</span>
            <h2 id="homestay-modal-title" class="modal-title">
              {{ homestay?.name || 'Homestay Property Details' }}
            </h2>
            <div class="badge-row">
              <span
                class="status-pill"
                [ngClass]="homestay?.approval_status || 'pending'"
              >
                Approval: {{ homestay?.approval_status | titlecase }}
              </span>
              <span
                class="verification-pill"
                [ngClass]="homestay?.verification_status || 'unverified'"
              >
                Verification: {{ homestay?.verification_status | titlecase }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="close-button"
            (click)="close.emit()"
            aria-label="Close homestay details modal"
            id="btn-close-homestay-detail-x"
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

        <!-- Rejection / Suspension Alert Banner -->
        <div *ngIf="homestay?.rejection_reason" class="alert-banner" [ngClass]="homestay?.approval_status === 'suspended' ? 'suspended' : 'rejected'">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="alert-content">
            <span class="alert-label">
              {{ homestay?.approval_status === 'suspended' ? 'Suspension Reason:' : 'Rejection Reason:' }}
            </span>
            <p class="alert-reason">{{ homestay?.rejection_reason }}</p>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <!-- Section 1: Overview & Location -->
          <section class="details-section">
            <h3 class="section-title">Location & Address</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="item-label">Location / Area</span>
                <span class="item-value bold">{{ homestay?.location || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">City</span>
                <span class="item-value">{{ homestay?.city || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">District</span>
                <span class="item-value">{{ homestay?.district || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Province</span>
                <span class="item-value">{{ homestay?.province || '—' }}</span>
              </div>
              <div class="info-item full-width" *ngIf="homestay?.address">
                <span class="item-label">Full Street Address</span>
                <span class="item-value">{{ homestay?.address }}</span>
              </div>
            </div>
          </section>

          <!-- Section 2: Property Description -->
          <section class="details-section" *ngIf="homestay?.description">
            <h3 class="section-title">Description</h3>
            <p class="property-description">{{ homestay?.description }}</p>
          </section>

          <!-- Section 3: Accommodation Capacity & Pricing -->
          <section class="details-section">
            <h3 class="section-title">Capacity & Pricing</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="item-label">Price per Night</span>
                <span class="item-value bold price">LKR {{ homestay?.price_per_night | number:'1.2-2' }}</span>
              </div>
              <div class="info-item">
                <span class="item-label">Maximum Guests</span>
                <span class="item-value">{{ homestay?.max_guests }} Guests</span>
              </div>
              <div class="info-item" *ngIf="homestay?.check_in_time">
                <span class="item-label">Check-In Time</span>
                <span class="item-value">{{ homestay?.check_in_time }}</span>
              </div>
              <div class="info-item" *ngIf="homestay?.check_out_time">
                <span class="item-label">Check-Out Time</span>
                <span class="item-value">{{ homestay?.check_out_time }}</span>
              </div>
              <div class="info-item" *ngIf="homestay?.cancellation_policy">
                <span class="item-label">Cancellation Policy</span>
                <span class="item-value">{{ homestay?.cancellation_policy }}</span>
              </div>
            </div>
          </section>

          <!-- Section 4: Amenities -->
          <section class="details-section">
            <h3 class="section-title">Amenities</h3>
            @if (homestay?.amenities && homestay!.amenities!.length > 0) {
              <div class="amenities-wrap">
                @for (amenity of homestay!.amenities; track amenity.id || amenity.amenity_name) {
                  <span class="amenity-chip">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    {{ amenity.amenity_name }}
                  </span>
                }
              </div>
            } @else {
              <p class="empty-hint">No specific amenities declared for this listing.</p>
            }
          </section>

          <!-- Section 5: Gallery Images -->
          <section class="details-section">
            <h3 class="section-title">Listing Images</h3>
            @if (homestay?.images && homestay!.images!.length > 0) {
              <div class="images-grid">
                @for (img of homestay!.images; track img.id || img.image_url) {
                  <div class="image-card">
                    <img [src]="img.image_url" [alt]="img.caption || homestay?.name" class="property-img" loading="lazy" />
                    <span *ngIf="img.is_primary" class="primary-badge">Primary Cover</span>
                    <span *ngIf="img.caption" class="caption-badge">{{ img.caption }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="image-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>No property photos uploaded yet</span>
              </div>
            }
          </section>

          <!-- Section 6: Audit & Verification Trail -->
          <section class="details-section audit-section">
            <h3 class="section-title">Listing Audit Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="item-label">Listing Created</span>
                <span class="item-value">{{ homestay?.created_at ? (homestay?.created_at | date:'medium') : '—' }}</span>
              </div>
              <div class="info-item" *ngIf="homestay?.updated_at">
                <span class="item-label">Last Updated</span>
                <span class="item-value">{{ homestay?.updated_at | date:'medium' }}</span>
              </div>
              <div class="info-item" *ngIf="homestay?.reviewed_at">
                <span class="item-label">Admin Reviewed At</span>
                <span class="item-value">{{ homestay?.reviewed_at | date:'medium' }}</span>
              </div>
              <div class="info-item" *ngIf="homestay?.owner_id">
                <span class="item-label">Host / Provider Account ID</span>
                <span class="item-value">Provider #{{ homestay?.owner_id }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- Modal Footer -->
        <footer class="modal-footer">
          <button type="button" class="btn-secondary" (click)="close.emit()" id="btn-close-homestay-detail-bottom">
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
        max-width: 820px;
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

      .homestay-id-badge {
        font-size: 0.75rem;
        font-weight: 700;
        color: #0284c7;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .modal-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }

      .badge-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }

      .status-pill {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .status-pill.approved {
        background: #dcfce7;
        color: #15803d;
      }

      .status-pill.pending {
        background: #fef3c7;
        color: #b45309;
      }

      .status-pill.rejected {
        background: #fee2e2;
        color: #b91c1c;
      }

      .status-pill.suspended {
        background: #f1f5f9;
        color: #475569;
      }

      .verification-pill {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .verification-pill.verified {
        background: #e0f2fe;
        color: #0369a1;
      }

      .verification-pill.pending {
        background: #fef3c7;
        color: #b45309;
      }

      .verification-pill.unverified {
        background: #f1f5f9;
        color: #64748b;
      }

      .verification-pill.rejected {
        background: #fee2e2;
        color: #b91c1c;
      }

      .close-button {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.35rem;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .close-button:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      .alert-banner {
        display: flex;
        gap: 0.75rem;
        padding: 0.85rem 1.5rem;
        align-items: center;
      }

      .alert-banner.rejected {
        background: #fef2f2;
        border-bottom: 1px solid #fee2e2;
        color: #991b1b;
      }

      .alert-banner.suspended {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        color: #475569;
      }

      .alert-content {
        font-size: 0.875rem;
      }

      .alert-label {
        font-weight: 700;
        margin-right: 0.35rem;
      }

      .alert-reason {
        display: inline;
        margin: 0;
      }

      .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .details-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .section-title {
        font-size: 0.925rem;
        font-weight: 700;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin: 0;
        padding-bottom: 0.35rem;
        border-bottom: 1px solid #f1f5f9;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .info-item.full-width {
        grid-column: 1 / -1;
      }

      .item-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
      }

      .item-value {
        font-size: 0.875rem;
        color: #1e293b;
      }

      .item-value.bold {
        font-weight: 600;
      }

      .item-value.price {
        color: #0284c7;
        font-size: 1rem;
      }

      .property-description {
        font-size: 0.875rem;
        color: #475569;
        line-height: 1.5;
        margin: 0;
        background: #f8fafc;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        border: 1px solid #f1f5f9;
      }

      .amenities-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .amenity-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.75rem;
        background: #f0f9ff;
        color: #0369a1;
        border: 1px solid #bae6fd;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .images-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.75rem;
      }

      .image-card {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        aspect-ratio: 16 / 10;
        background: #f1f5f9;
      }

      .property-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .primary-badge {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        background: #0284c7;
        color: #ffffff;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
      }

      .caption-badge {
        position: absolute;
        bottom: 0;
        inset-inline: 0;
        background: rgba(15, 23, 42, 0.75);
        color: #ffffff;
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .image-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 2rem;
        background: #f8fafc;
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        color: #94a3b8;
        font-size: 0.85rem;
      }

      .empty-hint {
        font-size: 0.85rem;
        color: #94a3b8;
        font-style: italic;
        margin: 0;
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
export class AdminHomestayDetailModalComponent {
  @Input() homestay: HomestayResponse | null = null;
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
}
