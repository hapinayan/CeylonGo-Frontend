import { Injectable } from '@angular/core';
import { Category, Sort } from '../models/catalog';

@Injectable({providedIn: 'root'})
export class DiscoverViewState {
  preview?: {
    category: Category; location: string; sort: Sort; rating: number; page: number;
    filtersOpen: boolean; searched: boolean;
    form: {location: string; date: string; travelers: number | null};
  };
  live?: {
    search: string; category: Category; ecoCategory: string; badgeOnly: boolean; page: number;
    filtersOpen: boolean;
    ranges: {district: string; minPrice: number | null; maxPrice: number | null;
      minDuration: number | null; maxDuration: number | null};
  };
}
