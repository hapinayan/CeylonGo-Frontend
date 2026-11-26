import { Injectable, signal } from '@angular/core';

/**
 * Global registry service to ensure only one AdminSelectComponent dropdown
 * remains open at a time across the admin application.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminSelectRegistryService {
  private readonly activeSelectId = signal<string | null>(null);

  get activeId() {
    return this.activeSelectId.asReadonly();
  }

  registerOpen(id: string): void {
    this.activeSelectId.set(id);
  }

  registerClose(id: string): void {
    if (this.activeSelectId() === id) {
      this.activeSelectId.set(null);
    }
  }

  closeAll(): void {
    this.activeSelectId.set(null);
  }
}
