import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, inject, output, signal } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss',
})
export class AdminHeaderComponent {
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly elementRef = inject(ElementRef);

  readonly openMobileDrawer = output<void>();

  readonly currentUser = this.adminAuthService.currentUser;
  readonly isSuperAdmin = this.adminAuthService.isSuperAdmin;
  readonly roleDisplayName = this.adminAuthService.roleDisplayName;
  readonly isDemoPreview = signal<boolean>(!environment.production && !!environment.features?.adminPreviewMode);

  readonly isMenuOpen = signal<boolean>(false);

  toggleProfileMenu(): void {
    this.isMenuOpen.update((val) => !val);
  }

  logout(): void {
    this.isMenuOpen.set(false);
    this.adminAuthService.logout();
  }

  get userInitials(): string {
    const user = this.currentUser();
    if (!user || !user.full_name) return 'A';
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
    }
  }
}
