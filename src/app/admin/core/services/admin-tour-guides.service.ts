import { AdminListingDirectoryService, ListingReview, listingVerificationStatus } from './admin-listing-directory.service';
import { computed, inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';

import {
  AdminTourGuideDetailResponse,
  AdminTourGuideListResponse,
  CredentialVerifyPayload,
  TourGuideBadgePayload,
  TourGuideDecisionPayload,
  TourGuideKPIs,
  TourGuideQueryParams,
} from '../models/admin-tour-guides.models';
import { AdminPreviewStateService } from '../preview/admin-preview-state.service';
import {
  canReviewTourGuides,
  canVerifyGuideCredentials,
  canViewTourGuides,
} from '../utils/admin-permissions.utils';
import { AdminAuthService } from './admin-auth.service';

function guide(r: ListingReview): AdminTourGuideListResponse['items'][number] {
  const l = r.listing;
  const settings = r.details['guide'] ?? r.details;
  return { id: l.id, provider_profile_id: l.provider_id, business_name: r.provider.business_name,
    provider_name: r.provider.business_name, email: r.provider.email, base_city: l.locality,
    base_district: l.district, province: settings.province, daily_rate: Number(l.price),
    currency: l.currency, approval_status: l.approval_status as AdminTourGuideListResponse['items'][number]['approval_status'],
    verification_status: listingVerificationStatus(r), is_active: l.is_active, is_available: l.is_active,
    years_of_experience: settings.years_of_experience, review_count: 0,
    pending_credentials_count: 0, approved_credentials_count: 0, created_at: l.created_at };
}

@Injectable({
  providedIn: 'root',
})
export class AdminTourGuidesService {
  private readonly directory = inject(AdminListingDirectoryService);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly previewStateService = inject(AdminPreviewStateService);


  readonly currentUser = this.adminAuthService.currentUser;
  readonly canViewGuides = computed(() => canViewTourGuides(this.currentUser()));
  readonly canReviewGuides = computed(() => canReviewTourGuides(this.currentUser()));
  readonly canVerifyCredentials = computed(() => canVerifyGuideCredentials(this.currentUser()));

  getTourGuides(params: TourGuideQueryParams = {}): Observable<AdminTourGuideListResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getTourGuides(params));
    }

    return this.directory.list('tour_guide', guide, { ...params, status: params?.approval_status });
  }

  getTourGuideById(id: number): Observable<AdminTourGuideDetailResponse> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.getTourGuideById(id));
    }
    return this.directory.detail(id, (r): AdminTourGuideDetailResponse => {
      const item = guide(r);
      return { ...item, guide: { ...item, bio: r.listing.description,
          max_group_size: r.details['max_group_size'] }, phone: r.provider.phone,
        provider_approval_status: r.provider.verification_status,
        languages: [], service_areas: [], images: [], credentials: [], verification_history: [],
        packages: r.details['packages'] ?? [] };
    });
  }

  approveTourGuide(id: number, reason?: string): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.approveTourGuide(id, reason));
    }
    return this.directory.decide(id, 'approved', reason).pipe(
      map(() => ({ success: true, tour_guide_id: id, message: 'Listing decision saved.' })));
  }

  rejectTourGuide(id: number, payload: TourGuideDecisionPayload): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.rejectTourGuide(id, payload));
    }
    return this.directory.decide(id, 'rejected', payload.reason).pipe(
      map(() => ({ success: true, tour_guide_id: id, message: 'Listing decision saved.' })));
  }

  suspendTourGuide(id: number, payload?: TourGuideDecisionPayload): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.suspendTourGuide(id, payload));
    }
    return this.directory.decide(id, 'suspended', payload?.reason).pipe(
      map(() => ({ success: true, tour_guide_id: id, message: 'Listing decision saved.' })));
  }

  reinstateTourGuide(id: number): Observable<{ success: boolean; tour_guide_id: number; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.reinstateTourGuide(id));
    }
    return throwError(() => new Error('This action is unavailable in the MVP listing workflow.'));
  }

  updateTourGuideBadge(id: number, payload: TourGuideBadgePayload): Observable<{ success: boolean; tour_guide_id: number; verification_status: string; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.updateTourGuideBadge(id, payload));
    }
    return throwError(() => new Error('Separate guide verification is unavailable in the MVP.'));
  }

  verifyGuideCredential(credentialId: number, payload: CredentialVerifyPayload): Observable<{ success: boolean; credential_id: number; verification_status: string; message: string }> {
    if (this.adminAuthService.isDemoSession()) {
      return of(this.previewStateService.verifyGuideCredential(credentialId, payload));
    }
    return throwError(() => new Error('This action is unavailable in the MVP listing workflow.'));
  }

  getTourGuideKPIs(): Observable<TourGuideKPIs> {
    return this.directory.list('tour_guide', guide, { page_size: 1 }).pipe(map(({counts, active}) => ({
      total_guides: Object.values(counts).reduce((a,b) => a+b, 0), active_guides: active,
      pending_approval: counts['pending'] ?? 0, verified_guides: counts['approved'] ?? 0,
    })));
  }
}
