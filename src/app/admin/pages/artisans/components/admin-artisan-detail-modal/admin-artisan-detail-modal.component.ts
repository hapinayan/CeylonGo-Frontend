import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import {
  AdminArtisanListingItem,
  AdminArtisanProductItem,
  AdminArtisanReviewItem,
} from '../../../../core/models/admin-artisans.models';

@Component({
  selector: 'app-admin-artisan-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-artisan-detail-modal.component.html',
  styleUrls: ['./admin-artisan-detail-modal.component.scss'],
})
export class AdminArtisanDetailModalComponent {
  @Input({ required: true }) listing!: AdminArtisanListingItem;
  @Input() products: AdminArtisanProductItem[] = [];
  @Input() reviews: AdminArtisanReviewItem[] = [];
  @Input() canReview = false;
  @Input() canModerate = false;
  @Input() isProcessing = false;

  @Output() close = new EventEmitter<void>();
  @Output() approve = new EventEmitter<number>();
  @Output() reject = new EventEmitter<number>();
  @Output() suspend = new EventEmitter<number>();
  @Output() toggleFeature = new EventEmitter<{ id: number; isFeatured: boolean }>();
  @Output() approveProduct = new EventEmitter<number>();
  @Output() rejectProduct = new EventEmitter<number>();
  @Output() toggleReviewPublish = new EventEmitter<{ reviewId: number; isPublished: boolean }>();

  activeTab: 'details' | 'products' | 'reviews' = 'details';

  onClose(): void {
    this.close.emit();
  }

  onApprove(): void {
    this.approve.emit(this.listing.id);
  }

  onReject(): void {
    this.reject.emit(this.listing.id);
  }

  onSuspend(): void {
    this.suspend.emit(this.listing.id);
  }

  onToggleFeature(): void {
    this.toggleFeature.emit({
      id: this.listing.id,
      isFeatured: !this.listing.is_featured,
    });
  }

  onApproveProd(productId: number): void {
    this.approveProduct.emit(productId);
  }

  onRejectProd(productId: number): void {
    this.rejectProduct.emit(productId);
  }

  onToggleRev(review: AdminArtisanReviewItem): void {
    this.toggleReviewPublish.emit({
      reviewId: review.id,
      isPublished: !review.is_published,
    });
  }
}
