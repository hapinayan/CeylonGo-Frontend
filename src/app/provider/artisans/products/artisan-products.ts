import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProviderService } from '../../../core/services/provider.service';
import {
  ArtisanProductDetails,
  ArtisanProductImage,
  ArtisanProductInput,
  ReviewListing,
} from '../../../core/models/provider.models';
import { CANONICAL_ARTISAN_CATEGORIES } from '../../../features/artisan/services/artisan.service';
import { ProviderPreviewService } from '../../provider-preview.service';

@Component({
  selector: 'app-artisan-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './artisan-products.html',
  styleUrl: './artisan-products.scss',
})
export class ArtisanProducts implements OnInit, OnDestroy {
  private readonly providerService = inject(ProviderService);
  private readonly previewService = inject(ProviderPreviewService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isPreview = this.previewService.isPreview;
  readonly previewQueryParams = this.previewService.queryParams;
  readonly craftCategories = [...CANONICAL_ARTISAN_CATEGORIES];

  readonly isLoading = signal<boolean>(true);
  readonly isLoadingProducts = signal<boolean>(false);
  readonly artisanListings = signal<ReviewListing[]>([]);
  readonly selectedListingId = signal<number | null>(null);
  readonly products = signal<ArtisanProductDetails[]>([]);
  readonly photoPreviews = signal<Record<string, SafeUrl>>({});
  readonly bannerMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private readonly objectUrls = new Map<string, string>();

  newProductName = '';
  newProductCategory = 'Handicrafts';
  newProductDescription = '';
  newProductMaterials = '';
  newProductPrice: number | null = null;

  editingProductId: number | null = null;
  editTitle = '';
  editCategory = 'Handicrafts';
  editDescription = '';
  editMaterials = '';
  editPrice: number | null = null;

  readonly selectedListing = computed(() => {
    const id = this.selectedListingId();
    return this.artisanListings().find((l) => l.listing.id === id) ?? null;
  });

  ngOnInit(): void {
    const paramId = this.route.snapshot.queryParamMap.get('listingId');
    this.loadArtisanListings(paramId ? Number(paramId) : null);
  }

  ngOnDestroy(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  onListingChange(listingId: number): void {
    this.selectedListingId.set(listingId);
    this.cancelEdit();
    this.loadProductsForListing(listingId);
  }

  loadArtisanListings(preferredId: number | null = null): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.providerService.getProviderListings(100, 0, 'artisan').subscribe({
      next: (items) => {
        this.artisanListings.set(items);
        let activeId: number | null = null;
        if (preferredId && items.some((i) => i.listing.id === preferredId)) {
          activeId = preferredId;
        } else if (items.length > 0) {
          activeId = items[0].listing.id;
        }
        this.selectedListingId.set(activeId);
        this.isLoading.set(false);
        if (activeId) {
          this.loadProductsForListing(activeId);
        } else {
          this.products.set([]);
        }
      },
      error: () => {
        this.errorMessage.set('Could not load Artisan listings.');
        this.isLoading.set(false);
      },
    });
  }

  loadProductsForListing(listingId: number): void {
    this.isLoadingProducts.set(true);
    this.providerService.getArtisanProducts(listingId, 1, 50).subscribe({
      next: (page) => {
        const list = Array.isArray(page?.items) ? page.items : [];
        this.products.set(list);
        this.isLoadingProducts.set(false);
        if (!this.isPreview()) {
          for (const product of list) {
            for (const img of product.images ?? product.product_images ?? []) {
              this.loadPhotoPreview(listingId, product.id, img);
            }
          }
        }
      },
      error: (err) => {
        this.products.set([]);
        this.isLoadingProducts.set(false);
        this.errorMessage.set(err?.error?.detail || 'Could not load Artisan showcase products.');
      },
    });
  }

  addProduct(): void {
    const listingId = this.selectedListingId();
    const title = this.newProductName.trim();
    if (!listingId || !title) return;

    if (this.isPreview()) {
      this.bannerMessage.set('Adding products is disabled in Preview Mode.');
      return;
    }

    const payload: ArtisanProductInput = {
      title,
      category: this.newProductCategory || 'Handicrafts',
      description:
        this.newProductDescription.trim() || `${title} handcrafted at ${this.selectedListing()?.listing.title || 'our studio'}.`,
      materials: this.newProductMaterials.trim() || null,
      price:
        this.newProductPrice != null && Number.isFinite(Number(this.newProductPrice)) && Number(this.newProductPrice) >= 0
          ? Number(this.newProductPrice)
          : null,
      is_active: true,
    };

    this.errorMessage.set(null);
    this.providerService.createArtisanProduct(listingId, payload).subscribe({
      next: (created) => {
        this.products.update((curr) => [...curr, created]);
        this.newProductName = '';
        this.newProductDescription = '';
        this.newProductMaterials = '';
        this.newProductPrice = null;
        this.bannerMessage.set(`Added "${created.title}" to showcase.`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || err?.message || 'Could not add product.');
      },
    });
  }

  startEdit(product: ArtisanProductDetails): void {
    this.editingProductId = product.id;
    this.editTitle = product.title;
    this.editCategory = product.category || 'Handicrafts';
    this.editDescription = product.description || '';
    this.editMaterials = product.materials || '';
    this.editPrice = product.price != null ? Number(product.price) : null;
  }

  cancelEdit(): void {
    this.editingProductId = null;
    this.editTitle = '';
    this.editCategory = 'Handicrafts';
    this.editDescription = '';
    this.editMaterials = '';
    this.editPrice = null;
  }

  saveEdit(product: ArtisanProductDetails): void {
    const listingId = this.selectedListingId();
    const clean = this.editTitle.trim();
    if (!listingId || !clean) return;
    if (this.isPreview()) {
      this.bannerMessage.set('Editing products is disabled in Preview Mode.');
      return;
    }

    const payload: ArtisanProductInput = {
      title: clean,
      category: this.editCategory || product.category || 'Handicrafts',
      description: this.editDescription.trim() || product.description || clean,
      materials: this.editMaterials.trim() || null,
      price: this.editPrice != null && Number.isFinite(Number(this.editPrice)) ? Number(this.editPrice) : null,
      is_active: product.is_active !== false && product.is_available !== false,
    };

    this.providerService.updateArtisanProduct(listingId, product.id, payload).subscribe({
      next: (updated) => {
        this.replaceProduct(updated);
        this.cancelEdit();
        this.bannerMessage.set('Showcase item updated.');
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Could not update product.');
      },
    });
  }

  toggleProductActive(product: ArtisanProductDetails): void {
    const listingId = this.selectedListingId();
    if (!listingId) return;
    if (this.isPreview()) {
      this.bannerMessage.set('Updating product availability is disabled in Preview Mode.');
      return;
    }

    const nextActive = !(product.is_active !== false && product.is_available !== false);
    const payload: ArtisanProductInput = {
      title: product.title,
      category: product.category || 'Handicrafts',
      description: product.description || product.title,
      materials: product.materials || null,
      price: product.price,
      is_active: nextActive,
    };

    this.providerService.updateArtisanProduct(listingId, product.id, payload).subscribe({
      next: (updated) => {
        this.replaceProduct(updated);
        this.bannerMessage.set(nextActive ? `"${updated.title}" activated.` : `"${updated.title}" deactivated.`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Could not update status.');
      },
    });
  }

  deleteProduct(product: ArtisanProductDetails): void {
    const listingId = this.selectedListingId();
    if (!listingId) return;
    if (this.isPreview()) {
      this.bannerMessage.set('Removing products is disabled in Preview Mode.');
      return;
    }

    this.providerService.deleteArtisanProduct(listingId, product.id).subscribe({
      next: () => {
        this.products.update((curr) =>
          curr.map((p) => (p.id === product.id ? { ...p, is_active: false, is_available: false } : p)),
        );
        this.bannerMessage.set(`"${product.title}" deactivated from public showcase.`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Could not deactivate product.');
      },
    });
  }

  onPhotoSelected(product: ArtisanProductDetails, event: Event): void {
    const listingId = this.selectedListingId();
    const input = event.target as HTMLInputElement;
    if (!listingId || !input.files?.length) return;
    if (this.isPreview()) {
      this.bannerMessage.set('Photo uploads are disabled in Preview Mode.');
      input.value = '';
      return;
    }
    const file = input.files[0];

    this.providerService.uploadArtisanProductPhoto(listingId, product.id, file, product.title).subscribe({
      next: (uploaded) => {
        this.products.update((curr) =>
          curr.map((p) =>
            p.id === product.id
              ? { ...p, images: [...(p.images ?? []), uploaded], product_images: [...(p.product_images ?? []), uploaded] }
              : p,
          ),
        );
        this.loadPhotoPreview(listingId, product.id, uploaded);
        this.bannerMessage.set(`Photo added to "${product.title}".`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Could not upload product photo.');
      },
      complete: () => {
        input.value = '';
      },
    });
  }

  deletePhoto(product: ArtisanProductDetails, photoId: number): void {
    const listingId = this.selectedListingId();
    if (!listingId || this.isPreview()) return;
    this.providerService.deleteArtisanProductPhoto(listingId, product.id, photoId).subscribe({
      next: () => {
        this.products.update((curr) =>
          curr.map((p) =>
            p.id === product.id
              ? {
                  ...p,
                  images: (p.images ?? []).filter((i) => i.id !== photoId),
                  product_images: (p.product_images ?? []).filter((i) => i.id !== photoId),
                }
              : p,
          ),
        );
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Could not delete product photo.');
      },
    });
  }

  photoKey(productId: number, photoId: number): string {
    return `${productId}:${photoId}`;
  }

  private loadPhotoPreview(listingId: number, productId: number, img: ArtisanProductImage): void {
    this.providerService.getArtisanProductPhotoBlob(listingId, productId, img.id).subscribe({
      next: (blob) => {
        const key = this.photoKey(productId, img.id);
        const prev = this.objectUrls.get(key);
        if (prev) URL.revokeObjectURL(prev);
        const objUrl = URL.createObjectURL(blob);
        this.objectUrls.set(key, objUrl);
        this.photoPreviews.update((map) => ({
          ...map,
          [key]: this.sanitizer.bypassSecurityTrustUrl(objUrl),
        }));
      },
      error: () => {},
    });
  }

  private replaceProduct(updated: ArtisanProductDetails): void {
    this.products.update((curr) => curr.map((p) => (p.id === updated.id ? updated : p)));
  }
}
