import { Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class ReservationWriteLock {
  private readonly pending = new Set<string>();

  start(traveler: number | 'preview', slot: number): boolean {
    const key = traveler + ':' + slot;
    if (this.pending.has(key)) return false;
    this.pending.add(key);
    return true;
  }

  finish(traveler: number | 'preview', slot: number): void {
    this.pending.delete(traveler + ':' + slot);
  }
}
