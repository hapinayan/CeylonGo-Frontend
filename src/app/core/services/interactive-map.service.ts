import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ANONYMOUS_API_REQUEST } from '../interceptors/auth.interceptor';
import { MapMarker, MapMarkersQuery } from '../models/weather-map.models';

@Injectable({
  providedIn: 'root',
})
export class InteractiveMapService {
  private readonly http = inject(HttpClient);
  private readonly markersUrl = `${environment.apiBaseUrl}/map/markers`;
  private readonly anonymousContext = new HttpContext().set(ANONYMOUS_API_REQUEST, true);

  /**
   * Retrieve publicly discoverable service markers for Sri Lanka.
   * Endpoint: GET /api/v1/map/markers
   */
  getMarkers(query: MapMarkersQuery = {}): Observable<MapMarker[]> {
    let params = new HttpParams();

    if (query.category) {
      params = params.set('category', query.category);
    }
    if (query.district && query.district.trim()) {
      params = params.set('district', query.district.trim().slice(0, 80));
    }
    if (query.q && query.q.trim()) {
      params = params.set('q', query.q.trim().slice(0, 100));
    }
    if (query.bbox && query.bbox.trim()) {
      params = params.set('bbox', query.bbox.trim());
    }
    if (query.limit && Number.isInteger(query.limit)) {
      const clamped = Math.min(200, Math.max(1, query.limit));
      params = params.set('limit', String(clamped));
    }

    return this.http
      .get<MapMarker[]>(this.markersUrl, {
        params,
        context: this.anonymousContext,
      })
      .pipe(map((res) => (Array.isArray(res) ? res : [])));
  }
}
