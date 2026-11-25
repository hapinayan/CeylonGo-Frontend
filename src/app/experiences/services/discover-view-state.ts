import { ViewportScroller } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Category, Sort } from '../models/catalog';

@Injectable({providedIn: 'root'})
export class DiscoverViewState {
  captureScroll(): () => [number, number] {
    const viewport = inject(ViewportScroller);
    let position = viewport.getScrollPosition();
    inject(Router).events.pipe(
      filter(event => event instanceof NavigationStart),
      takeUntilDestroyed(),
    ).subscribe(() => position = viewport.getScrollPosition());
    return () => position;
  }

  revealResults(heading: HTMLElement): void {
    heading.focus({preventScroll: true});
    const reduced = heading.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView?.({block: 'start', behavior: reduced ? 'instant' : 'smooth'});
  }

  preview?: {
    scroll: [number, number];
    category: Category; location: string; sort: Sort; rating: number; page: number;
    filtersOpen: boolean; searched: boolean;
    form: {location: string; date: string; travelers: number | null};
  };
  live?: {
    scroll: [number, number];
    search: string; category: Category; ecoCategory: string; badgeOnly: boolean; page: number;
    filtersOpen: boolean;
    ranges: {district: string; minPrice: number | null; maxPrice: number | null;
      minDuration: number | null; maxDuration: number | null};
  };
}
