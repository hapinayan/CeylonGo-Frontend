import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Experience } from '../models/catalog';
import { EcoDetail, EcoPage, EcoQuery, EcoReviews, EcoSlot, EcoSummary } from '../models/eco';
import { ANONYMOUS_API_REQUEST } from '../../core/interceptors/auth.interceptor';

@Injectable({ providedIn: 'root' })
export class EcoApi {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiBaseUrl + '/eco-experiences';

  browse(query: EcoQuery) {
    let params = new HttpParams().set('page', query.page).set('page_size', 8);
    if (query.search) params = params.set('search', query.search);
    if (query.category) params = params.set('category', query.category);
    if (query.district) params = params.set('district', query.district);
    if (query.minPrice != null) params = params.set('min_price', query.minPrice);
    if (query.maxPrice != null) params = params.set('max_price', query.maxPrice);
    if (query.minDuration != null) params = params.set('min_duration_hours', query.minDuration);
    if (query.maxDuration != null) params = params.set('max_duration_hours', query.maxDuration);
    if (query.badgeOnly) params = params.set('eco_badge_only', true);
    return this.get<EcoPage>('', params).pipe(map(page => ({
      items: page.items.map(toExperience), total: page.total, pages: page.total_pages,
    })));
  }

  categories() { return this.get<string[]>('/categories'); }
  detail(id: number) { return this.get<EcoDetail>('/' + id); }
  reviews(id: number) { return this.get<EcoReviews>('/' + id + '/reviews', new HttpParams().set('page_size', 5)); }
  availability(id: number) { return this.get<EcoSlot[]>('/' + id + '/availability', new HttpParams().set('page_size', 1)); }

  private get<T>(path: string, params?: HttpParams) {
    return this.http.get<T>(this.url + path, {
      params, context: new HttpContext().set(ANONYMOUS_API_REQUEST, true),
    });
  }
}

export function toExperience(item: EcoSummary): Experience {
  return {
    id: String(item.id), title: item.title, category: 'eco', categoryLabel: item.eco_category,
    location: item.city === item.district ? item.city : [item.city, item.district].filter(Boolean).join(', '),
    price: Number(item.base_price), currency: item.currency,
    unit: item.pricing_type === 'per_person' ? 'person' : item.pricing_type === 'per_group' ? 'group' : undefined,
  };
}

export function ecoImageUrl(value: string): string | undefined {
  try {
    const url = new URL(value, new URL(environment.apiBaseUrl).origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
