import { ViewportScroller } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Category, Sort } from '../models/catalog';

@Injectable({ providedIn: 'root' })
export class DiscoverViewState {
  captureScroll(): () => [number, number] {
    const viewport = inject(ViewportScroller);
    let position = viewport.getScrollPosition();
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => (position = viewport.getScrollPosition()));
    return () => position;
  }

  revealResults(heading: HTMLElement): void {
    heading.focus({ preventScroll: true });
    const reduced = heading.ownerDocument.defaultView?.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    heading.scrollIntoView?.({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
  }

  live?: {
    scroll: [number, number];
    category: Category;
    destination: string;
    date: string;
    participants: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    sort: Sort;
    page: number;
    offset: number;
    offsetHistory: number[];
    filtersOpen: boolean;
  };
}
