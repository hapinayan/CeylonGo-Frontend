import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AdminHeaderComponent } from './components/admin-header/admin-header.component';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminSidebarComponent, AdminHeaderComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isMobileDrawerOpen = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((val) => !val);
  }

  openMobileDrawer(): void {
    this.isMobileDrawerOpen.set(true);
  }

  closeMobileDrawer(): void {
    this.isMobileDrawerOpen.set(false);
  }
}
