import { inject, Injectable, signal } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { AdminUser } from '../models/admin-auth.models';
import {
  ProviderCategory,
  ProviderDetailResponse,
  ProviderListItem,
  ProviderListResponse,
  ProviderQueryParams,
} from '../models/admin-providers.models';
import {
  isValidTravelerStatusReason,
  TravelerAccount,
  TravelerDirectory,
  TravelerQueryParams,
  TravelerStatusEvent,
  TravelerStatusUpdate,
} from '../models/admin-travelers.models';
import {
  ProviderReviewActionResponse,
  ProviderVerificationItem,
  RejectProviderRequest,
  VerificationDocumentType,
} from '../models/admin-verifications.models';
import {
  HomestayAdminDashboardResponse,
  HomestayListResponse,
  HomestayQueryParams,
  HomestayResponse,
  HomestayReviewRequest,
  HomestayVerificationRequest,
} from '../models/admin-homestays.models';
import {
  ActivityApprovalRequest,
  ActivityListResponse,
  ActivityQueryParams,
  ActivityRejectionRequest,
  ActivityResponse,
} from '../models/admin-activities.models';
import {
  AdminRentalFleetSummaryResponse,
  AdminVehicleDetailResponse,
  AdminVehicleDocumentItem,
  AdminVehicleListItem,
  AdminVehicleListResponse,
  AdminVehicleReviewRequest,
  AdminVehicleReviewResponse,
  AdminVehicleVerifyStatusRequest,
  AdminVehicleVerifyStatusResponse,
  RentalQueryParams,
} from '../models/admin-rentals.models';
import {
  AdminTourGuideDetailResponse,
  AdminTourGuideListItem,
  AdminTourGuideListResponse,
  CredentialVerifyPayload,
  TourGuideBadgePayload,
  TourGuideDecisionPayload,
  TourGuideKPIs,
  TourGuideQueryParams,
} from '../models/admin-tour-guides.models';
import {
  AdminArtisanBusinessKPIs,
  AdminArtisanListingItem,
  AdminArtisanProductItem,
  AdminArtisanReviewItem,
  ArtisanQueryParams,
  ArtisanRejectionPayload,
  ArtisanReviewModerationPayload,
  ArtisanSuspendPayload,
} from '../models/admin-artisans.models';
import {
  AdminBookingDetailResponse,
  AdminBookingKPIs,
  AdminBookingListItem,
  BookingQueryParams,
} from '../models/admin-bookings.models';
import {
  AdminFinancialSummaryResponse,
  AdminPaymentTransactionItem,
  PaymentQueryParams,
} from '../models/admin-payments.models';
import {
  AdminCommunityReportItem,
  AdminCommunityReportListResponse,
  CommunityQueryParams,
  ModerateContentPayload,
} from '../models/admin-community.models';
import {
  BookingVolumeReport,
  PlatformAnalyticsOverview,
} from '../models/admin-reports.models';
import {
  AdminProfileDetails,
  UpdateProfileRequest,
} from '../models/admin-profile.models';
import {
  AdminAccountItem,
  AdminInvitationRequest,
  AdminManagementQueryParams,
} from '../models/admin-management.models';
import {
  AdminAuditLogItem,
  AdminAuditLogListResponse,
  AuditLogQueryParams,
} from '../models/admin-audit-logs.models';
import { SystemSettingsBundle } from '../models/admin-system-settings.models';
import { AdminAuthService } from '../services/admin-auth.service';
import { getProvinceByDistrict } from '../constants/admin-districts.constants';
import {
  canModerateArtisanReviews,
  canReviewActivities,
  canReviewArtisans,
  canReviewHomestays,
  canReviewRentals,
  canReviewTourGuides,
  canVerifyGuideCredentials,
  canVerifyHomestays,
  canVerifyRentalDocuments,
  canViewArtisans,
  canViewBookings,
  canViewPayments,
  canViewCommunity,
  canModerateCommunity,
  canViewReports,
  canManageAdmins,
  canViewAuditLogs,
  canManageSystemSettings,
  isSuperAdminUser,
} from '../utils/admin-permissions.utils';
import {
  generateMockDocumentSvg,
  MOCK_PREVIEW_ACTIVITIES,
  MOCK_PREVIEW_ADMIN_ACCOUNTS,
  MOCK_PREVIEW_ADMIN_PROFILE,
  MOCK_PREVIEW_ANALYTICS_OVERVIEW,
  MOCK_PREVIEW_ARTISAN_PRODUCTS,
  MOCK_PREVIEW_ARTISAN_REVIEWS,
  MOCK_PREVIEW_ARTISANS,
  MOCK_PREVIEW_AUDIT_LOGS,
  MOCK_PREVIEW_BOOKINGS,
  MOCK_PREVIEW_COMMUNITY_REPORTS,
  MOCK_PREVIEW_FINANCIAL_SUMMARY,
  MOCK_PREVIEW_HOMESTAY_DASHBOARD,
  MOCK_PREVIEW_HOMESTAYS,
  MOCK_PREVIEW_PAYMENTS,
  MOCK_PREVIEW_PROVIDERS,
  MOCK_PREVIEW_RENTAL_DOCUMENTS,
  MOCK_PREVIEW_RENTAL_FLEET_SUMMARY,
  MOCK_PREVIEW_RENTALS,
  MOCK_PREVIEW_SYSTEM_SETTINGS,
  MOCK_PREVIEW_TOUR_GUIDE_DETAILS,
  MOCK_PREVIEW_TOUR_GUIDES,
  MOCK_PREVIEW_TRAVELER_HISTORY,
  MOCK_PREVIEW_TRAVELERS,
  MOCK_PREVIEW_VERIFICATIONS,
} from './admin-preview-fixtures';

@Injectable({
  providedIn: 'root',
})
export class AdminPreviewStateService {
  private readonly adminAuthService = inject(AdminAuthService);

  private static readonly STORAGE_KEY_PROVIDERS = 'ceylongo_preview_providers_state';
  private static readonly STORAGE_KEY_TRAVELERS = 'ceylongo_preview_travelers_state';
  private static readonly STORAGE_KEY_TRAVELER_HISTORY = 'ceylongo_preview_traveler_history_state';
  private static readonly STORAGE_KEY_HOMESTAYS = 'ceylongo_preview_homestays_state';
  private static readonly STORAGE_KEY_ACTIVITIES = 'ceylongo_preview_activities_state';
  private static readonly STORAGE_KEY_RENTALS = 'ceylongo_preview_rentals_state';
  private static readonly STORAGE_KEY_RENTAL_DOCS = 'ceylongo_preview_rental_documents_state';
  private static readonly STORAGE_KEY_TOUR_GUIDES = 'ceylongo_preview_tour_guides_state';
  private static readonly STORAGE_KEY_ARTISANS = 'ceylongo_preview_artisans_state';
  private static readonly STORAGE_KEY_ARTISAN_PRODUCTS = 'ceylongo_preview_artisan_products_state';
  private static readonly STORAGE_KEY_ARTISAN_REVIEWS = 'ceylongo_preview_artisan_reviews_state';
  private static readonly STORAGE_KEY_BOOKINGS = 'ceylongo_preview_bookings_state';
  private static readonly STORAGE_KEY_PAYMENTS = 'ceylongo_preview_payments_state';
  private static readonly STORAGE_KEY_COMMUNITY = 'ceylongo_preview_community_state';
  private static readonly STORAGE_KEY_ADMIN_PROFILE = 'ceylongo_preview_admin_profile_state';
  private static readonly STORAGE_KEY_ADMIN_ACCOUNTS = 'ceylongo_preview_admin_accounts_state';
  private static readonly STORAGE_KEY_AUDIT_LOGS = 'ceylongo_preview_audit_logs_state';
  private static readonly STORAGE_KEY_SYSTEM_SETTINGS = 'ceylongo_preview_system_settings_state';

  private travelersSignal = signal<TravelerAccount[]>([]);
  private travelerHistorySignal = signal<Record<number, TravelerStatusEvent[]>>({});
  private providersSignal = signal<ProviderDetailResponse[]>([]);
  private verificationsSignal = signal<ProviderVerificationItem[]>([]);
  private homestaysSignal = signal<HomestayResponse[]>([]);
  private activitiesSignal = signal<ActivityResponse[]>([]);
  private rentalsSignal = signal<AdminVehicleDetailResponse[]>([]);
  private rentalDocsSignal = signal<Record<number, AdminVehicleDocumentItem[]>>({});
  private tourGuidesSignal = signal<AdminTourGuideListItem[]>([]);
  private tourGuideDetailsSignal = signal<Record<number, AdminTourGuideDetailResponse>>({});
  private artisansSignal = signal<AdminArtisanListingItem[]>([]);
  private artisanProductsSignal = signal<Record<number, AdminArtisanProductItem[]>>({});
  private artisanReviewsSignal = signal<AdminArtisanReviewItem[]>([]);
  private bookingsSignal = signal<AdminBookingListItem[]>([]);
  private paymentsSignal = signal<AdminPaymentTransactionItem[]>([]);
  private financialSummarySignal = signal<AdminFinancialSummaryResponse>(MOCK_PREVIEW_FINANCIAL_SUMMARY);
  private communityReportsSignal = signal<AdminCommunityReportItem[]>([]);
  private analyticsOverviewSignal = signal<PlatformAnalyticsOverview>(MOCK_PREVIEW_ANALYTICS_OVERVIEW);
  private adminProfileSignal = signal<AdminProfileDetails>(MOCK_PREVIEW_ADMIN_PROFILE);
  private adminAccountsSignal = signal<AdminAccountItem[]>([]);
  private auditLogsSignal = signal<AdminAuditLogItem[]>([]);
  private systemSettingsSignal = signal<SystemSettingsBundle>(MOCK_PREVIEW_SYSTEM_SETTINGS);
  private lastSessionKey: string | null = null;

  constructor() {
    this.assertProductionBlocked();
    this.restoreOrResetState();
  }

  /**
   * Defense-in-depth security guard: Prevents preview state execution in production.
   */
  private assertProductionBlocked(): void {
    const isProd = environment.production === true;
    const isPreviewDisabled =
      !environment.features?.adminPreviewMode &&
      !(environment as unknown as Record<string, unknown>)['adminPreviewMode'];

    if (isProd || isPreviewDisabled) {
      throw new Error(
        'Security Violation: Admin preview mock state is strictly forbidden in production or when preview mode is disabled.'
      );
    }
  }

  /**
   * Defense-in-depth runtime session guard:
   * Asserts that:
   * 1. Environment is not production.
   * 2. Admin preview mode is explicitly enabled.
   * 3. An active session exists.
   * 4. The active session is a valid development demo preview session (not a real user session).
   * 5. Automatically detects session replacement or role changes and resets state.
   */
  assertDevelopmentPreviewAccess(): void {
    this.assertProductionBlocked();

    if (!this.adminAuthService.isAuthenticated()) {
      this.resetStateInternal();
      throw new Error('HTTP 401 Unauthorized: Preview state requires an active authenticated demo session.');
    }

    if (!this.adminAuthService.isDemoSession()) {
      this.resetStateInternal();
      throw new Error(
        'HTTP 403 Forbidden: Real authenticated users cannot access or mutate local preview demo state.'
      );
    }

    const user = this.adminAuthService.currentUser();
    const token = this.adminAuthService.currentToken();
    const currentSessionKey = `${user?.id}_${user?.role || user?.admin_role}_${token}`;
    if (this.lastSessionKey && this.lastSessionKey !== currentSessionKey) {
      this.resetStateInternal();
    }
    this.lastSessionKey = currentSessionKey;
  }

  /**
   * Restores state from sessionStorage if available in demo mode, else resets to default.
   */
  private restoreOrResetState(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const savedProviders = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_PROVIDERS);
        const savedTravelers = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_TRAVELERS);
        const savedHistory = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_TRAVELER_HISTORY);
        const savedHomestays = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_HOMESTAYS);
        const savedActivities = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_ACTIVITIES);
        const savedRentals = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_RENTALS);
        const savedRentalDocs = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_RENTAL_DOCS);
        const savedTourGuides = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_TOUR_GUIDES);
        const savedArtisans = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_ARTISANS);
        const savedArtisanProducts = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_ARTISAN_PRODUCTS);
        const savedArtisanReviews = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_ARTISAN_REVIEWS);
        const savedBookings = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_BOOKINGS);

        if (savedProviders) {
          this.providersSignal.set(JSON.parse(savedProviders));
        } else {
          this.providersSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_PROVIDERS)));
        }

        if (savedTravelers) {
          this.travelersSignal.set(JSON.parse(savedTravelers));
        } else {
          this.travelersSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TRAVELERS)));
        }

        if (savedHistory) {
          this.travelerHistorySignal.set(JSON.parse(savedHistory));
        } else {
          this.travelerHistorySignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TRAVELER_HISTORY)));
        }

        if (savedHomestays) {
          this.homestaysSignal.set(JSON.parse(savedHomestays));
        } else {
          this.homestaysSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_HOMESTAYS)));
        }

        if (savedActivities) {
          this.activitiesSignal.set(JSON.parse(savedActivities));
        } else {
          this.activitiesSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ACTIVITIES)));
        }

        if (savedRentals) {
          this.rentalsSignal.set(JSON.parse(savedRentals));
        } else {
          this.rentalsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_RENTALS)));
        }

        if (savedRentalDocs) {
          this.rentalDocsSignal.set(JSON.parse(savedRentalDocs));
        } else {
          this.rentalDocsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_RENTAL_DOCUMENTS)));
        }

        if (savedTourGuides) {
          this.tourGuidesSignal.set(JSON.parse(savedTourGuides));
        } else {
          this.tourGuidesSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TOUR_GUIDES)));
        }
        this.tourGuideDetailsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TOUR_GUIDE_DETAILS)));

        if (savedArtisans) {
          this.artisansSignal.set(JSON.parse(savedArtisans));
        } else {
          this.artisansSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ARTISANS)));
        }

        if (savedArtisanProducts) {
          this.artisanProductsSignal.set(JSON.parse(savedArtisanProducts));
        } else {
          this.artisanProductsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ARTISAN_PRODUCTS)));
        }

        if (savedArtisanReviews) {
          this.artisanReviewsSignal.set(JSON.parse(savedArtisanReviews));
        } else {
          this.artisanReviewsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ARTISAN_REVIEWS)));
        }

        if (savedBookings) {
          this.bookingsSignal.set(JSON.parse(savedBookings));
        } else {
          this.bookingsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_BOOKINGS)));
        }

        const savedPayments = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_PAYMENTS);
        if (savedPayments) {
          this.paymentsSignal.set(JSON.parse(savedPayments));
        } else {
          this.paymentsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_PAYMENTS)));
        }

        const savedCommunity = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_COMMUNITY);
        if (savedCommunity) {
          this.communityReportsSignal.set(JSON.parse(savedCommunity));
        } else {
          this.communityReportsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_COMMUNITY_REPORTS)));
        }

        const savedProfile = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_ADMIN_PROFILE);
        if (savedProfile) {
          this.adminProfileSignal.set(JSON.parse(savedProfile));
        } else {
          this.adminProfileSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ADMIN_PROFILE)));
        }

        const savedAccounts = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_ADMIN_ACCOUNTS);
        if (savedAccounts) {
          this.adminAccountsSignal.set(JSON.parse(savedAccounts));
        } else {
          this.adminAccountsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ADMIN_ACCOUNTS)));
        }

        const savedAuditLogs = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_AUDIT_LOGS);
        if (savedAuditLogs) {
          this.auditLogsSignal.set(JSON.parse(savedAuditLogs));
        } else {
          this.auditLogsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_AUDIT_LOGS)));
        }

        const savedSettings = window.sessionStorage.getItem(AdminPreviewStateService.STORAGE_KEY_SYSTEM_SETTINGS);
        if (savedSettings) {
          this.systemSettingsSignal.set(JSON.parse(savedSettings));
        } else {
          this.systemSettingsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_SYSTEM_SETTINGS)));
        }

        this.financialSummarySignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_FINANCIAL_SUMMARY)));
        this.analyticsOverviewSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ANALYTICS_OVERVIEW)));
        this.verificationsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_VERIFICATIONS)));
        return;
      }
    } catch {
      // Fallback to internal fixtures if sessionStorage fails
    }
    this.resetStateInternal();
  }

  /**
   * Internal reset without calling session assertion (used at initialization or logout).
   */
  private resetStateInternal(): void {
    this.assertProductionBlocked();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_PROVIDERS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_TRAVELERS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_TRAVELER_HISTORY);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_HOMESTAYS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_ACTIVITIES);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_RENTALS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_RENTAL_DOCS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_TOUR_GUIDES);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_ARTISANS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_ARTISAN_PRODUCTS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_ARTISAN_REVIEWS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_BOOKINGS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_PAYMENTS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_COMMUNITY);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_ADMIN_PROFILE);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_ADMIN_ACCOUNTS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_AUDIT_LOGS);
        window.sessionStorage.removeItem(AdminPreviewStateService.STORAGE_KEY_SYSTEM_SETTINGS);
      }
    } catch {
      // Ignore sessionStorage cleanup error
    }
    this.travelersSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TRAVELERS)));
    this.travelerHistorySignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TRAVELER_HISTORY)));
    this.providersSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_PROVIDERS)));
    this.verificationsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_VERIFICATIONS)));
    this.homestaysSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_HOMESTAYS)));
    this.activitiesSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ACTIVITIES)));
    this.rentalsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_RENTALS)));
    this.rentalDocsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_RENTAL_DOCUMENTS)));
    this.tourGuidesSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TOUR_GUIDES)));
    this.tourGuideDetailsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_TOUR_GUIDE_DETAILS)));
    this.artisansSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ARTISANS)));
    this.artisanProductsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ARTISAN_PRODUCTS)));
    this.artisanReviewsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ARTISAN_REVIEWS)));
    this.bookingsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_BOOKINGS)));
    this.paymentsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_PAYMENTS)));
    this.financialSummarySignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_FINANCIAL_SUMMARY)));
    this.communityReportsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_COMMUNITY_REPORTS)));
    this.analyticsOverviewSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ANALYTICS_OVERVIEW)));
    this.adminProfileSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ADMIN_PROFILE)));
    this.adminAccountsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_ADMIN_ACCOUNTS)));
    this.auditLogsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_AUDIT_LOGS)));
    this.systemSettingsSignal.set(JSON.parse(JSON.stringify(MOCK_PREVIEW_SYSTEM_SETTINGS)));
  }

  private persistSessionState(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_PROVIDERS,
          JSON.stringify(this.providersSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_TRAVELERS,
          JSON.stringify(this.travelersSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_TRAVELER_HISTORY,
          JSON.stringify(this.travelerHistorySignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_HOMESTAYS,
          JSON.stringify(this.homestaysSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_ACTIVITIES,
          JSON.stringify(this.activitiesSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_RENTALS,
          JSON.stringify(this.rentalsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_RENTAL_DOCS,
          JSON.stringify(this.rentalDocsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_TOUR_GUIDES,
          JSON.stringify(this.tourGuidesSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_ARTISANS,
          JSON.stringify(this.artisansSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_ARTISAN_PRODUCTS,
          JSON.stringify(this.artisanProductsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_ARTISAN_REVIEWS,
          JSON.stringify(this.artisanReviewsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_BOOKINGS,
          JSON.stringify(this.bookingsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_PAYMENTS,
          JSON.stringify(this.paymentsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_COMMUNITY,
          JSON.stringify(this.communityReportsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_ADMIN_PROFILE,
          JSON.stringify(this.adminProfileSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_ADMIN_ACCOUNTS,
          JSON.stringify(this.adminAccountsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_AUDIT_LOGS,
          JSON.stringify(this.auditLogsSignal())
        );
        window.sessionStorage.setItem(
          AdminPreviewStateService.STORAGE_KEY_SYSTEM_SETTINGS,
          JSON.stringify(this.systemSettingsSignal())
        );
      }
    } catch {
      // In-memory signals remain authoritative
    }
  }

  /**
   * Public reset of preview state to initial deterministic fixtures.
   * Enforces runtime demo session guard.
   */
  resetState(): void {
    this.assertDevelopmentPreviewAccess();
    this.resetStateInternal();
  }

  // =========================================================================
  // Module 03: Traveler Management Mock Handlers
  // =========================================================================

  getTravelers(params?: TravelerQueryParams): TravelerDirectory {
    this.assertDevelopmentPreviewAccess();
    let items = [...this.travelersSignal()];

    if (params?.is_active !== undefined && params?.is_active !== null) {
      items = items.filter((t) => t.is_active === params.is_active);
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (t) => t.full_name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, Math.min(100, params?.page_size || params?.limit || 20));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: pagedItems,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  }

  getTraveler(id: number): TravelerAccount | null {
    this.assertDevelopmentPreviewAccess();
    const traveler = this.travelersSignal().find((t) => t.id === id);
    return traveler ? { ...traveler } : null;
  }

  getTravelerHistory(travelerId: number): TravelerStatusEvent[] {
    this.assertDevelopmentPreviewAccess();
    const history = this.travelerHistorySignal()[travelerId] || [];
    return JSON.parse(JSON.stringify(history));
  }

  updateTravelerStatus(
    travelerId: number,
    payload: TravelerStatusUpdate,
    _callerActor?: AdminUser | null
  ): TravelerAccount {
    this.assertDevelopmentPreviewAccess();

    // Security: Derive actor strictly from authenticated session, never caller input
    const actor = this.adminAuthService.currentUser();

    // Enforce Super Admin authorization constraint (matches backend require_super_admin)
    if (!actor || !isSuperAdminUser(actor)) {
      throw new Error(
        'HTTP 403 Forbidden: Only Super Administrators are authorized to update traveler account status.'
      );
    }

    const traveler = this.travelersSignal().find((t) => t.id === travelerId);
    if (!traveler) {
      throw new Error(`HTTP 404 Not Found: Traveler #${travelerId} not found.`);
    }

    if (!payload.note || payload.note.trim().length === 0 || payload.note.length > 500) {
      throw new Error('HTTP 422 Unprocessable Entity: Administrative note must be between 1 and 500 characters.');
    }

    if (!isValidTravelerStatusReason(payload.is_active, payload.reason_code)) {
      throw new Error(
        `HTTP 422 Unprocessable Entity: Invalid reason_code '${payload.reason_code}' for target status is_active=${payload.is_active}.`
      );
    }

    const previousStatus = traveler.is_active;
    traveler.is_active = payload.is_active;

    // Record audit event
    const event: TravelerStatusEvent = {
      admin_user_id: actor?.id || 1,
      created_at: new Date().toISOString(),
      previous_is_active: previousStatus,
      is_active: payload.is_active,
      reason_code: payload.reason_code,
      note: payload.note.trim(),
    };

    const currentHistory = { ...this.travelerHistorySignal() };
    const list = currentHistory[travelerId] ? [...currentHistory[travelerId]] : [];
    list.unshift(event);
    currentHistory[travelerId] = list;
    this.travelerHistorySignal.set(currentHistory);
    this.persistSessionState();

    return { ...traveler };
  }

  // =========================================================================
  // Module 04: Service Provider Management Mock Handlers
  // =========================================================================

  getProviders(params?: ProviderQueryParams): ProviderListResponse {
    this.assertDevelopmentPreviewAccess();
    let items = [...this.providersSignal()];

    if (params?.status) {
      items = items.filter((p) => p.approval_status === params.status);
    }

    if (params?.category) {
      items = items.filter((p) => p.provider_type === params.category);
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.business_name.toLowerCase().includes(q) ||
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, Math.min(100, params?.limit || 20));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = items.slice((page - 1) * limit, page * limit);

    const summaryItems: ProviderListItem[] = paged.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      business_name: p.business_name,
      provider_type: p.provider_type,
      district: p.district,
      approval_status: p.approval_status,
      created_at: p.created_at,
    }));

    return {
      items: summaryItems,
      total,
      page,
      limit,
      total_pages: totalPages,
    };
  }

  getProvider(id: number): ProviderDetailResponse | null {
    this.assertDevelopmentPreviewAccess();
    const provider = this.providersSignal().find((p) => p.id === id);
    return provider ? JSON.parse(JSON.stringify(provider)) : null;
  }

  // =========================================================================
  // Module 05: Verification Queue & Review Actions
  // =========================================================================

  getVerificationQueue(params?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): ProviderVerificationItem[] {
    this.assertDevelopmentPreviewAccess();
    let list = [...this.providersSignal()];

    if (params?.status && params.status !== 'all') {
      list = list.filter((p) => p.approval_status === params.status);
    } else if (!params?.status) {
      list = list.filter((p) => p.approval_status === 'pending');
    }

    if (params?.category && params.category !== 'all') {
      list = list.filter((p) => p.provider_type === params.category);
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.business_name.toLowerCase().includes(q) ||
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    return list.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      business_name: p.business_name,
      provider_type: p.provider_type,
      district: p.district,
      approval_status: p.approval_status,
      created_at: p.created_at,
      documents: [
        {
          type: 'selfie',
          title: 'Live Selfie / Photo',
          isAvailable: p.selfie_uploaded,
          previewUrl: p.selfie_uploaded
            ? generateMockDocumentSvg('selfie', `prov-${p.id}`)
            : undefined,
        },
        {
          type: 'nic_front',
          title: 'National ID / Passport (Front)',
          isAvailable: p.nic_front_uploaded,
          previewUrl: p.nic_front_uploaded
            ? generateMockDocumentSvg('nic_front', `prov-${p.id}`)
            : undefined,
        },
        {
          type: 'nic_back',
          title: 'National ID (Back)',
          isAvailable: p.nic_back_uploaded,
          previewUrl: p.nic_back_uploaded
            ? generateMockDocumentSvg('nic_back', `prov-${p.id}`)
            : undefined,
        },
      ],
    }));
  }

  approveProvider(
    providerId: number,
    _callerActor?: AdminUser | null
  ): ProviderReviewActionResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = this.adminAuthService.currentUser();
    const provider = this.providersSignal().find((p) => p.id === providerId);
    if (!provider) {
      throw new Error(`HTTP 404 Not Found: Provider application #${providerId} not found.`);
    }

    if (provider.approval_status === 'approved') {
      throw new Error('HTTP 400 Bad Request: Provider application is already approved.');
    }

    if (provider.approval_status === 'rejected') {
      throw new Error('HTTP 400 Bad Request: Cannot approve a rejected application directly.');
    }

    if (provider.approval_status !== 'pending') {
      throw new Error('HTTP 400 Bad Request: Only pending provider applications can be approved.');
    }

    // Require identity documents
    if (!provider.selfie_uploaded || !provider.nic_front_uploaded || !provider.nic_back_uploaded) {
      throw new Error('HTTP 400 Bad Request: Cannot approve application: required identity documents are missing.');
    }

    provider.approval_status = 'approved';
    provider.is_active = true;
    provider.reviewed_at = new Date().toISOString();
    provider.reviewed_by = actor?.id || 1;
    provider.reviewer_name = actor?.full_name || 'Super Administrator';

    // Explicitly update signal array reference to notify all reactive readers
    this.providersSignal.set([...this.providersSignal()]);
    this.persistSessionState();

    return {
      success: true,
      provider_id: providerId,
      approval_status: 'approved',
      rejection_reason: null,
      message: 'Provider application has been successfully approved.',
      email_sent: true,
    };
  }

  rejectProvider(
    providerId: number,
    payload: RejectProviderRequest,
    _callerActor?: AdminUser | null
  ): ProviderReviewActionResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = this.adminAuthService.currentUser();
    const provider = this.providersSignal().find((p) => p.id === providerId);
    if (!provider) {
      throw new Error(`HTTP 404 Not Found: Provider application #${providerId} not found.`);
    }

    if (provider.approval_status === 'rejected') {
      throw new Error('HTTP 400 Bad Request: Provider application is already rejected.');
    }

    if (provider.approval_status === 'approved') {
      throw new Error('HTTP 400 Bad Request: Cannot reject an already approved application.');
    }

    if (provider.approval_status !== 'pending') {
      throw new Error('HTTP 400 Bad Request: Only pending provider applications can be rejected.');
    }

    if (!payload.reason || payload.reason.trim().length < 5 || payload.reason.trim().length > 500) {
      throw new Error('HTTP 422 Unprocessable Entity: Rejection reason must be between 5 and 500 characters.');
    }

    provider.approval_status = 'rejected';
    provider.is_active = false;
    provider.reviewed_at = new Date().toISOString();
    provider.reviewed_by = actor?.id || 1;
    provider.reviewer_name = actor?.full_name || 'Super Administrator';
    provider.rejection_reason = payload.reason.trim();

    // Explicitly update signal array reference to notify all reactive readers
    this.providersSignal.set([...this.providersSignal()]);
    this.persistSessionState();

    return {
      success: true,
      provider_id: providerId,
      approval_status: 'rejected',
      rejection_reason: payload.reason.trim(),
      message: 'Provider application has been rejected.',
      email_sent: true,
    };
  }

  getIdentityDocumentPreview(
    providerId: number,
    documentType: VerificationDocumentType
  ): string {
    this.assertDevelopmentPreviewAccess();

    if (!['selfie', 'nic_front', 'nic_back'].includes(documentType)) {
      throw new Error(`HTTP 400 Bad Request: Invalid document type '${documentType}'. Allowed: selfie, nic_front, nic_back.`);
    }

    const provider = this.providersSignal().find((p) => p.id === providerId);
    if (!provider) {
      throw new Error(`HTTP 404 Not Found: Provider application #${providerId} not found.`);
    }

    if (documentType === 'selfie' && !provider.selfie_uploaded) {
      throw new Error('HTTP 404 Not Found: Selfie document not uploaded.');
    }
    if (documentType === 'nic_front' && !provider.nic_front_uploaded) {
      throw new Error('HTTP 404 Not Found: NIC front document not uploaded.');
    }
    if (documentType === 'nic_back' && !provider.nic_back_uploaded) {
      throw new Error('HTTP 404 Not Found: NIC back document not uploaded.');
    }

    return generateMockDocumentSvg(documentType, `prov-${providerId}`);
  }

  /* ==============================================================================
   * MODULE 06: HOMESTAY MANAGEMENT HANDLERS
   * ============================================================================== */

  getHomestays(params?: HomestayQueryParams): HomestayListResponse {
    this.assertDevelopmentPreviewAccess();

    let list = [...this.homestaysSignal()];

    if (params?.status && params.status !== 'all') {
      const targetStatus = params.status.trim().toLowerCase();
      list = list.filter((h) => h.approval_status.toLowerCase() === targetStatus);
    }

    if (params?.verification_status && params.verification_status !== 'all') {
      const targetVerif = params.verification_status.trim().toLowerCase();
      list = list.filter((h) => h.verification_status.toLowerCase() === targetVerif);
    }

    if (params?.province && params.province.trim() && params.province !== 'all') {
      const targetProvince = params.province.trim().toLowerCase();
      list = list.filter((h) => h.province.toLowerCase() === targetProvince);
    }

    if (params?.district && params.district.trim() && params.district !== 'all') {
      const targetDistrict = params.district.trim().toLowerCase();
      list = list.filter(
        (h) =>
          h.district.toLowerCase() === targetDistrict ||
          h.district.toLowerCase().includes(targetDistrict)
      );
    }

    if (params?.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(term) ||
          h.location.toLowerCase().includes(term) ||
          h.city.toLowerCase().includes(term) ||
          h.district.toLowerCase().includes(term)
      );
    }

    const total = list.length;
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, Math.min(100, params?.limit || 10));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = list.slice((page - 1) * limit, page * limit);

    return {
      items: paged,
      total,
      page,
      limit,
      total_pages: totalPages,
    };
  }

  getHomestay(id: number): HomestayResponse | null {
    this.assertDevelopmentPreviewAccess();
    return this.homestaysSignal().find((h) => h.id === id) || null;
  }

  reviewHomestay(
    id: number,
    payload: HomestayReviewRequest,
    admin?: AdminUser | null
  ): HomestayResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewHomestays(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can review homestay listings.');
    }

    const homestay = this.homestaysSignal().find((h) => h.id === id);
    if (!homestay) {
      throw new Error(`HTTP 404 Not Found: Homestay #${id} not found.`);
    }

    if (!['approved', 'rejected', 'suspended'].includes(payload.decision)) {
      throw new Error(`HTTP 400 Bad Request: Invalid decision '${payload.decision}'. Allowed: approved, rejected, suspended.`);
    }

    if (payload.decision === 'rejected' && (!payload.reason || payload.reason.trim().length < 5)) {
      throw new Error('HTTP 422 Unprocessable Entity: Rejection reason must be at least 5 characters long.');
    }

    homestay.approval_status = payload.decision;
    homestay.reviewed_by = actor?.id || 1;
    homestay.reviewed_at = new Date().toISOString();

    if (payload.decision === 'approved') {
      homestay.is_active = true;
      homestay.rejection_reason = undefined;
    } else if (payload.decision === 'rejected') {
      homestay.is_active = false;
      homestay.rejection_reason = payload.reason?.trim();
    } else if (payload.decision === 'suspended') {
      homestay.is_active = false;
      homestay.rejection_reason = payload.reason?.trim() || 'Listing suspended by administration.';
    }

    this.homestaysSignal.set([...this.homestaysSignal()]);
    this.persistSessionState();
    return { ...homestay };
  }

  verifyHomestay(
    id: number,
    payload: HomestayVerificationRequest,
    admin?: AdminUser | null
  ): HomestayResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canVerifyHomestays(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can verify homestays.');
    }

    const homestay = this.homestaysSignal().find((h) => h.id === id);
    if (!homestay) {
      throw new Error(`HTTP 404 Not Found: Homestay #${id} not found.`);
    }

    if (!['verified', 'unverified', 'rejected'].includes(payload.verification_status)) {
      throw new Error(`HTTP 400 Bad Request: Invalid verification status '${payload.verification_status}'.`);
    }

    homestay.verification_status = payload.verification_status;
    this.homestaysSignal.set([...this.homestaysSignal()]);
    this.persistSessionState();
    return { ...homestay };
  }

  getHomestayDashboard(): HomestayAdminDashboardResponse {
    this.assertDevelopmentPreviewAccess();

    const all = this.homestaysSignal();
    const approved = all.filter((h) => h.approval_status === 'approved').length;
    const pending = all.filter((h) => h.approval_status === 'pending').length;
    const rejected = all.filter((h) => h.approval_status === 'rejected').length;
    const suspended = all.filter((h) => h.approval_status === 'suspended').length;
    const draft = all.filter((h) => h.approval_status === 'draft').length;

    return {
      listings: {
        total: all.length,
        approved,
        pending_approval: pending,
        draft,
        rejected,
        suspended,
      },
      bookings: MOCK_PREVIEW_HOMESTAY_DASHBOARD.bookings,
      payments: MOCK_PREVIEW_HOMESTAY_DASHBOARD.payments,
      campaigns: MOCK_PREVIEW_HOMESTAY_DASHBOARD.campaigns,
      reviews: MOCK_PREVIEW_HOMESTAY_DASHBOARD.reviews,
    };
  }

  /* ==============================================================================
   * MODULE 07: ADVENTURE ACTIVITIES HANDLERS
   * ============================================================================== */

  getActivities(params?: ActivityQueryParams): ActivityListResponse {
    this.assertDevelopmentPreviewAccess();

    let list = [...this.activitiesSignal()];

    if (params?.status && params.status !== 'all') {
      const targetStatus = params.status.trim().toLowerCase();
      list = list.filter((a) => a.approval_status.toLowerCase() === targetStatus);
    }

    if (params?.category && params.category !== 'all') {
      const targetCategory = params.category.trim().toLowerCase();
      list = list.filter((a) => a.category.toLowerCase() === targetCategory);
    }

    if (params?.province && params.province !== 'all') {
      const targetProvince = params.province.trim().toLowerCase();
      list = list.filter((a) => {
        const prov = (a.province || getProvinceByDistrict(a.district) || '').trim().toLowerCase();
        return prov === targetProvince;
      });
    }

    if (params?.district && params.district !== 'all') {
      const targetDistrict = params.district.trim().toLowerCase();
      list = list.filter((a) => (a.district || '').toLowerCase() === targetDistrict);
    }

    if (params?.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(term) ||
          a.location.toLowerCase().includes(term) ||
          a.city.toLowerCase().includes(term)
      );
    }

    const total = list.length;
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, Math.min(100, params?.limit || 10));
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paged = list.slice((page - 1) * limit, page * limit);

    return {
      items: paged,
      total,
      page,
      limit,
      total_pages: totalPages,
    };
  }

  getActivity(id: number): ActivityResponse | null {
    this.assertDevelopmentPreviewAccess();
    return this.activitiesSignal().find((a) => a.id === id) || null;
  }

  approveActivity(
    id: number,
    payload?: ActivityApprovalRequest,
    admin?: AdminUser | null
  ): ActivityResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewActivities(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can approve adventure activities.');
    }

    const activity = this.activitiesSignal().find((a) => a.id === id);
    if (!activity) {
      throw new Error(`HTTP 404 Not Found: Activity #${id} not found.`);
    }

    if (activity.approval_status !== 'pending') {
      throw new Error('HTTP 409 Conflict: Only pending activities can be approved.');
    }

    activity.approval_status = 'approved';
    activity.is_active = true;
    activity.reviewed_by = actor?.id || 1;
    activity.reviewed_at = new Date().toISOString();
    activity.rejection_reason = undefined;

    this.activitiesSignal.set([...this.activitiesSignal()]);
    this.persistSessionState();
    return { ...activity };
  }

  rejectActivity(
    id: number,
    payload: ActivityRejectionRequest,
    admin?: AdminUser | null
  ): ActivityResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewActivities(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can reject adventure activities.');
    }

    const activity = this.activitiesSignal().find((a) => a.id === id);
    if (!activity) {
      throw new Error(`HTTP 404 Not Found: Activity #${id} not found.`);
    }

    if (activity.approval_status !== 'pending') {
      throw new Error('HTTP 409 Conflict: Only pending activities can be rejected.');
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      throw new Error('HTTP 422 Unprocessable Entity: Rejection reason must be at least 5 characters long.');
    }

    activity.approval_status = 'rejected';
    activity.is_active = false;
    activity.reviewed_by = actor?.id || 1;
    activity.reviewed_at = new Date().toISOString();
    activity.rejection_reason = payload.reason.trim();

    this.activitiesSignal.set([...this.activitiesSignal()]);
    this.persistSessionState();
    return { ...activity };
  }

  /* ==============================================================================
   * MODULE 08: BIKE AND BICYCLE RENTAL HANDLERS
   * ============================================================================== */

  getRentals(params?: RentalQueryParams): AdminVehicleListResponse {
    this.assertDevelopmentPreviewAccess();

    let list = [...this.rentalsSignal()];

    if (params?.approval_status && params.approval_status !== 'all') {
      const targetApproval = params.approval_status.trim().toLowerCase();
      list = list.filter((v) => v.approval_status.toLowerCase() === targetApproval);
    }

    if (params?.verification_status && params.verification_status !== 'all') {
      const targetVerification = params.verification_status.trim().toLowerCase();
      list = list.filter((v) => v.verification_status.toLowerCase() === targetVerification);
    }

    if (params?.vehicle_type && params.vehicle_type !== 'all') {
      const targetType = params.vehicle_type.trim().toLowerCase();
      list = list.filter((v) => v.vehicle_type.toLowerCase() === targetType);
    }

    if (params?.provider_id) {
      list = list.filter((v) => v.provider_id === params.provider_id);
    }

    if (params?.province && params.province !== 'all') {
      const targetProvince = params.province.trim().toLowerCase();
      list = list.filter((v) => {
        const prov = (v.province || getProvinceByDistrict(v.district) || '').trim().toLowerCase();
        return prov === targetProvince;
      });
    }

    if (params?.district && params.district.trim() && params.district !== 'all') {
      const targetDistrict = params.district.trim().toLowerCase();
      list = list.filter((v) => v.district.toLowerCase() === targetDistrict);
    }

    if (params?.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.vehicle_name.toLowerCase().includes(term) ||
          (v.license_plate && v.license_plate.toLowerCase().includes(term)) ||
          v.provider_business_name.toLowerCase().includes(term)
      );
    }

    const total = list.length;
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, Math.min(100, params?.page_size || 20));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const paged = list.slice((page - 1) * pageSize, page * pageSize);

    const items: AdminVehicleListItem[] = paged.map((v) => ({
      id: v.id,
      provider_id: v.provider_id,
      provider_business_name: v.provider_business_name,
      vehicle_name: v.vehicle_name,
      vehicle_type: v.vehicle_type,
      license_plate: v.license_plate,
      price_per_day: v.price_per_day,
      district: v.district,
      province: v.province || getProvinceByDistrict(v.district),
      status: v.status,
      approval_status: v.approval_status,
      verification_status: v.verification_status,
      primary_image_url: v.primary_image_url,
      created_at: v.created_at || new Date().toISOString(),
    }));

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  }

  getRental(id: number): AdminVehicleDetailResponse | null {
    this.assertDevelopmentPreviewAccess();
    return this.rentalsSignal().find((v) => v.id === id) || null;
  }

  reviewRental(
    id: number,
    payload: AdminVehicleReviewRequest,
    admin?: AdminUser | null
  ): AdminVehicleReviewResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewRentals(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can review rental vehicle listings.');
    }

    const vehicle = this.rentalsSignal().find((v) => v.id === id);
    if (!vehicle) {
      throw new Error(`HTTP 404 Not Found: Rental vehicle #${id} not found.`);
    }

    if (!['approved', 'rejected', 'suspended'].includes(payload.decision)) {
      throw new Error(`HTTP 400 Bad Request: Invalid decision '${payload.decision}'. Allowed: approved, rejected, suspended.`);
    }

    if (payload.decision === 'approved') {
      if (vehicle.approval_status === 'approved') {
        throw new Error('HTTP 400 Bad Request: Vehicle listing is already approved.');
      }
      if (vehicle.approval_status === 'rejected') {
        throw new Error('HTTP 400 Bad Request: Cannot approve a rejected listing directly. The provider must update listing specifications or documents first.');
      }

      // Backend requirement: verify required documents for motorized vehicles (bike, tuk_tuk)
      if (['bike', 'tuk_tuk'].includes(vehicle.vehicle_type)) {
        const docs = this.rentalDocsSignal()[vehicle.id] || [];
        const verifiedDocTypes = new Set(docs.filter((d) => d.is_verified).map((d) => d.document_type));
        if (!verifiedDocTypes.has('revenue_license') || !verifiedDocTypes.has('insurance_certificate')) {
          throw new Error('HTTP 400 Bad Request: Cannot approve motorized vehicle listing: verified revenue_license and insurance_certificate documents are required.');
        }
      }
      // Note: Bicycles (bicycle) do NOT require motor road licenses or insurance!

      vehicle.approval_status = 'approved';
      vehicle.reviewed_by = actor?.id || 1;
      vehicle.reviewed_at = new Date().toISOString();
      vehicle.rejection_reason = undefined;
      if (vehicle.status === 'retired') {
        vehicle.status = 'available';
      }
    } else if (payload.decision === 'rejected') {
      if (!payload.reason || payload.reason.trim().length < 5) {
        throw new Error('HTTP 422 Unprocessable Entity: Rejection reason must be at least 5 characters long.');
      }
      vehicle.approval_status = 'rejected';
      vehicle.reviewed_by = actor?.id || 1;
      vehicle.reviewed_at = new Date().toISOString();
      vehicle.rejection_reason = payload.reason.trim();
    } else if (payload.decision === 'suspended') {
      vehicle.approval_status = 'suspended';
      vehicle.status = 'retired';
      vehicle.reviewed_by = actor?.id || 1;
      vehicle.reviewed_at = new Date().toISOString();
      vehicle.rejection_reason = payload.reason?.trim() || 'Vehicle listing suspended by administration.';
    }

    this.rentalsSignal.set([...this.rentalsSignal()]);
    this.persistSessionState();

    return {
      success: true,
      vehicle_id: id,
      approval_status: vehicle.approval_status,
      message: `Vehicle listing has been ${vehicle.approval_status}.`,
      reviewed_at: vehicle.reviewed_at,
    };
  }

  getRentalDocuments(vehicleId: number): AdminVehicleDocumentItem[] {
    this.assertDevelopmentPreviewAccess();
    return this.rentalDocsSignal()[vehicleId] || [];
  }

  verifyRentalDocument(
    vehicleId: number,
    documentId: number,
    isVerified: boolean,
    notes?: string,
    admin?: AdminUser | null
  ): AdminVehicleDocumentItem {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canVerifyRentalDocuments(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can verify rental vehicle documents.');
    }

    const docs = this.rentalDocsSignal()[vehicleId] || [];
    const doc = docs.find((d) => d.id === documentId);
    if (!doc) {
      throw new Error(`HTTP 404 Not Found: Document #${documentId} not found for vehicle #${vehicleId}.`);
    }

    doc.is_verified = isVerified;
    doc.verification_notes = notes;
    doc.verified_at = isVerified ? new Date().toISOString() : undefined;

    // Update verified documents count on vehicle detail
    const vehicle = this.rentalsSignal().find((v) => v.id === vehicleId);
    if (vehicle) {
      vehicle.verified_documents_count = docs.filter((d) => d.is_verified).length;
      this.rentalsSignal.set([...this.rentalsSignal()]);
    }

    this.rentalDocsSignal.set({ ...this.rentalDocsSignal() });
    this.persistSessionState();
    return { ...doc };
  }

  verifyRentalStatus(
    vehicleId: number,
    payload: AdminVehicleVerifyStatusRequest,
    admin?: AdminUser | null
  ): AdminVehicleVerifyStatusResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canVerifyRentalDocuments(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can update vehicle verification status.');
    }

    const vehicle = this.rentalsSignal().find((v) => v.id === vehicleId);
    if (!vehicle) {
      throw new Error(`HTTP 404 Not Found: Rental vehicle #${vehicleId} not found.`);
    }

    if (!['verified', 'unverified', 'rejected', 'suspended'].includes(payload.verification_status)) {
      throw new Error(`HTTP 400 Bad Request: Invalid verification status '${payload.verification_status}'.`);
    }

    vehicle.verification_status = payload.verification_status;
    this.rentalsSignal.set([...this.rentalsSignal()]);
    this.persistSessionState();

    return {
      success: true,
      vehicle_id: vehicleId,
      verification_status: vehicle.verification_status,
      message: `Vehicle verification status updated to '${payload.verification_status}'.`,
    };
  }

  getRentalFleetSummary(): AdminRentalFleetSummaryResponse {
    this.assertDevelopmentPreviewAccess();

    const vehicles = this.rentalsSignal();
    const total = vehicles.length;
    const pending = vehicles.filter((v) => v.approval_status === 'pending').length;
    const approved = vehicles.filter((v) => v.approval_status === 'approved').length;
    const verified = vehicles.filter((v) => v.verification_status === 'verified').length;
    const rejected = vehicles.filter((v) => v.approval_status === 'rejected').length;
    const providerIds = new Set(vehicles.map((v) => v.provider_id));

    return {
      total_vehicles: total,
      pending_approval: pending,
      approved_vehicles: approved,
      verified_vehicles: verified,
      rejected_vehicles: rejected,
      total_providers: providerIds.size,
    };
  }

  // =========================================================================
  // PHASE 04A: TOUR GUIDE MANAGEMENT
  // =========================================================================

  getTourGuides(params: TourGuideQueryParams = {}): AdminTourGuideListResponse {
    this.assertDevelopmentPreviewAccess();

    let items = [...this.tourGuidesSignal()];

    if (params.approval_status && params.approval_status !== 'all') {
      items = items.filter((g) => g.approval_status === params.approval_status);
    }

    if (params.verification_status && params.verification_status !== 'all') {
      items = items.filter((g) => g.verification_status === params.verification_status);
    }

    if (params.province && params.province !== 'all') {
      items = items.filter((g) => {
        const prov = g.province || (g.base_district ? getProvinceByDistrict(g.base_district) : undefined);
        return prov === params.province;
      });
    }

    if (params.district && params.district !== 'all') {
      items = items.filter((g) => g.base_district.toLowerCase() === params.district!.toLowerCase());
    }

    if (params.is_active !== undefined) {
      items = items.filter((g) => g.is_active === params.is_active);
    }

    if (params.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      items = items.filter(
        (g) =>
          g.business_name.toLowerCase().includes(term) ||
          g.provider_name.toLowerCase().includes(term) ||
          g.email.toLowerCase().includes(term) ||
          g.base_city.toLowerCase().includes(term) ||
          g.base_district.toLowerCase().includes(term)
      );
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paged,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  }

  getTourGuideById(id: number): AdminTourGuideDetailResponse {
    this.assertDevelopmentPreviewAccess();

    const detail = this.tourGuideDetailsSignal()[id];
    if (detail) {
      return JSON.parse(JSON.stringify(detail));
    }

    const summary = this.tourGuidesSignal().find((g) => g.id === id);
    if (!summary) {
      throw new Error(`HTTP 404 Not Found: Tour Guide #${id} not found.`);
    }

    return {
      guide: {
        id: summary.id,
        provider_profile_id: summary.provider_profile_id,
        bio: `${summary.provider_name} is a licensed professional tour guide based in ${summary.base_city}, ${summary.base_district}.`,
        years_of_experience: summary.years_of_experience,
        daily_rate: summary.daily_rate,
        currency: summary.currency,
        base_city: summary.base_city,
        base_district: summary.base_district,
        province: summary.province,
        is_available: summary.is_available,
        approval_status: summary.approval_status,
        verification_status: summary.verification_status,
        is_active: summary.is_active,
        rating_average: summary.rating_average,
        review_count: summary.review_count,
        max_group_size: 10,
        created_at: summary.created_at,
      },
      business_name: summary.business_name,
      provider_name: summary.provider_name,
      email: summary.email,
      phone: '0712345678',
      provider_approval_status: 'approved',
      languages: [
        { id: 1, tour_guide_id: summary.id, language_code: 'en', proficiency_level: 'fluent' },
        { id: 2, tour_guide_id: summary.id, language_code: 'si', proficiency_level: 'native' },
      ],
      service_areas: [
        { id: 1, tour_guide_id: summary.id, area_name: `${summary.base_city} Region`, district: summary.base_district, is_primary: true },
      ],
      images: [],
      packages: [],
      credentials: [],
      verification_history: [],
    };
  }

  approveTourGuide(id: number, reason?: string, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewTourGuides(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can approve tour guides.');
    }

    const guide = this.tourGuidesSignal().find((g) => g.id === id);
    if (!guide) {
      throw new Error(`HTTP 404 Not Found: Tour Guide #${id} not found.`);
    }

    guide.approval_status = 'approved';
    guide.is_active = true;
    this.tourGuidesSignal.set([...this.tourGuidesSignal()]);

    const details = this.tourGuideDetailsSignal();
    if (details[id]) {
      details[id].guide.approval_status = 'approved';
      details[id].guide.is_active = true;
      this.tourGuideDetailsSignal.set({ ...details });
    }

    this.persistSessionState();
    return {
      success: true,
      tour_guide_id: id,
      approval_status: 'approved',
      message: 'Tour guide profile approved and activated.',
    };
  }

  rejectTourGuide(id: number, payload: TourGuideDecisionPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewTourGuides(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can reject tour guides.');
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      throw new Error('HTTP 422 Unprocessable Entity: A rejection reason of at least 5 characters is required.');
    }

    const guide = this.tourGuidesSignal().find((g) => g.id === id);
    if (!guide) {
      throw new Error(`HTTP 404 Not Found: Tour Guide #${id} not found.`);
    }

    guide.approval_status = 'rejected';
    guide.is_active = false;
    this.tourGuidesSignal.set([...this.tourGuidesSignal()]);

    const details = this.tourGuideDetailsSignal();
    if (details[id]) {
      details[id].guide.approval_status = 'rejected';
      details[id].guide.is_active = false;
      this.tourGuideDetailsSignal.set({ ...details });
    }

    this.persistSessionState();
    return {
      success: true,
      tour_guide_id: id,
      approval_status: 'rejected',
      message: 'Tour guide profile rejected.',
    };
  }

  suspendTourGuide(id: number, payload?: TourGuideDecisionPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewTourGuides(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can suspend tour guides.');
    }

    const guide = this.tourGuidesSignal().find((g) => g.id === id);
    if (!guide) {
      throw new Error(`HTTP 404 Not Found: Tour Guide #${id} not found.`);
    }

    guide.approval_status = 'suspended';
    guide.is_active = false;
    this.tourGuidesSignal.set([...this.tourGuidesSignal()]);

    const details = this.tourGuideDetailsSignal();
    if (details[id]) {
      details[id].guide.approval_status = 'suspended';
      details[id].guide.is_active = false;
      this.tourGuideDetailsSignal.set({ ...details });
    }

    this.persistSessionState();
    return {
      success: true,
      tour_guide_id: id,
      approval_status: 'suspended',
      message: 'Tour guide profile suspended.',
    };
  }

  reinstateTourGuide(id: number, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewTourGuides(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can reinstate tour guides.');
    }

    const guide = this.tourGuidesSignal().find((g) => g.id === id);
    if (!guide) {
      throw new Error(`HTTP 404 Not Found: Tour Guide #${id} not found.`);
    }

    guide.approval_status = 'approved';
    guide.is_active = true;
    this.tourGuidesSignal.set([...this.tourGuidesSignal()]);

    const details = this.tourGuideDetailsSignal();
    if (details[id]) {
      details[id].guide.approval_status = 'approved';
      details[id].guide.is_active = true;
      this.tourGuideDetailsSignal.set({ ...details });
    }

    this.persistSessionState();
    return {
      success: true,
      tour_guide_id: id,
      approval_status: 'approved',
      message: 'Tour guide profile reinstated.',
    };
  }

  updateTourGuideBadge(id: number, payload: TourGuideBadgePayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canVerifyGuideCredentials(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can update guide badges.');
    }

    const guide = this.tourGuidesSignal().find((g) => g.id === id);
    if (!guide) {
      throw new Error(`HTTP 404 Not Found: Tour Guide #${id} not found.`);
    }

    guide.verification_status = payload.action === 'grant' ? 'verified' : 'unverified';
    this.tourGuidesSignal.set([...this.tourGuidesSignal()]);

    const details = this.tourGuideDetailsSignal();
    if (details[id]) {
      details[id].guide.verification_status = guide.verification_status;
      this.tourGuideDetailsSignal.set({ ...details });
    }

    this.persistSessionState();
    return {
      success: true,
      tour_guide_id: id,
      verification_status: guide.verification_status,
      message: `Verified Guide Badge ${payload.action === 'grant' ? 'granted' : 'revoked'}.`,
    };
  }

  verifyGuideCredential(credentialId: number, payload: CredentialVerifyPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canVerifyGuideCredentials(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can verify guide credentials.');
    }

    const details = this.tourGuideDetailsSignal();
    let found = false;
    for (const guideId of Object.keys(details)) {
      const g = details[Number(guideId)];
      const cred = g.credentials.find((c) => c.id === credentialId);
      if (cred) {
        cred.verification_status = payload.status;
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`HTTP 404 Not Found: Guide credential #${credentialId} not found.`);
    }

    this.tourGuideDetailsSignal.set({ ...details });
    this.persistSessionState();

    return {
      success: true,
      credential_id: credentialId,
      verification_status: payload.status,
      message: `Credential review recorded with status '${payload.status}'.`,
    };
  }

  getTourGuideKPIs(): TourGuideKPIs {
    this.assertDevelopmentPreviewAccess();

    const guides = this.tourGuidesSignal();
    return {
      total_guides: guides.length,
      active_guides: guides.filter((g) => g.is_active).length,
      pending_approval: guides.filter((g) => g.approval_status === 'pending').length,
      verified_guides: guides.filter((g) => g.verification_status === 'verified').length,
    };
  }

  // =========================================================================
  // PHASE 04B: ARTISAN MANAGEMENT
  // =========================================================================

  getArtisanListings(params: ArtisanQueryParams = {}): AdminArtisanListingItem[] {
    this.assertDevelopmentPreviewAccess();

    let items = [...this.artisansSignal()];

    if (params.status && params.status !== 'all') {
      items = items.filter((a) => a.approval_status === params.status);
    }

    if (params.craft_category && params.craft_category !== 'all') {
      items = items.filter((a) => a.craft_category === params.craft_category);
    }

    if (params.province && params.province !== 'all') {
      items = items.filter((a) => {
        const prov = a.province || (a.district ? getProvinceByDistrict(a.district) : undefined);
        return prov === params.province;
      });
    }

    if (params.district && params.district !== 'all') {
      items = items.filter((a) => a.district.toLowerCase() === params.district!.toLowerCase());
    }

    if (params.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(term) ||
          (a.provider_business_name && a.provider_business_name.toLowerCase().includes(term)) ||
          a.city.toLowerCase().includes(term) ||
          a.district.toLowerCase().includes(term)
      );
    }

    return items;
  }

  getArtisanListingById(id: number): AdminArtisanListingItem {
    this.assertDevelopmentPreviewAccess();

    const item = this.artisansSignal().find((a) => a.id === id);
    if (!item) {
      throw new Error(`HTTP 404 Not Found: Artisan listing #${id} not found.`);
    }
    return JSON.parse(JSON.stringify(item));
  }

  approveArtisanListing(id: number, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewArtisans(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can approve artisan businesses.');
    }

    const listing = this.artisansSignal().find((a) => a.id === id);
    if (!listing) {
      throw new Error(`HTTP 404 Not Found: Artisan listing #${id} not found.`);
    }

    listing.approval_status = 'approved';
    listing.is_active = true;
    listing.rejection_reason = null;
    this.artisansSignal.set([...this.artisansSignal()]);
    this.persistSessionState();

    return {
      success: true,
      id,
      approval_status: 'approved',
      message: 'Artisan business listing approved successfully.',
    };
  }

  rejectArtisanListing(id: number, payload: ArtisanRejectionPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewArtisans(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can reject artisan businesses.');
    }

    if (!payload.reason || payload.reason.trim().length < 3) {
      throw new Error('HTTP 422 Unprocessable Entity: Rejection reason must contain at least 3 characters.');
    }

    const listing = this.artisansSignal().find((a) => a.id === id);
    if (!listing) {
      throw new Error(`HTTP 404 Not Found: Artisan listing #${id} not found.`);
    }

    listing.approval_status = 'rejected';
    listing.is_active = false;
    listing.is_featured = false;
    listing.rejection_reason = payload.reason.trim();
    this.artisansSignal.set([...this.artisansSignal()]);
    this.persistSessionState();

    return {
      success: true,
      id,
      approval_status: 'rejected',
      message: 'Artisan business listing rejected.',
    };
  }

  suspendArtisanListing(id: number, payload?: ArtisanSuspendPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewArtisans(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can suspend artisan businesses.');
    }

    const listing = this.artisansSignal().find((a) => a.id === id);
    if (!listing) {
      throw new Error(`HTTP 404 Not Found: Artisan listing #${id} not found.`);
    }

    listing.approval_status = 'suspended';
    listing.is_active = false;
    listing.is_featured = false;
    listing.rejection_reason = payload?.reason?.trim() || 'Suspended by administrator';
    this.artisansSignal.set([...this.artisansSignal()]);
    this.persistSessionState();

    return {
      success: true,
      id,
      approval_status: 'suspended',
      message: 'Artisan business listing suspended.',
    };
  }

  featureArtisanListing(id: number, isFeatured: boolean, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewArtisans(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can feature artisan businesses.');
    }

    const listing = this.artisansSignal().find((a) => a.id === id);
    if (!listing) {
      throw new Error(`HTTP 404 Not Found: Artisan listing #${id} not found.`);
    }

    if (isFeatured && (listing.approval_status !== 'approved' || !listing.is_active)) {
      throw new Error('HTTP 400 Bad Request: Cannot feature an artisan business that is not approved and active.');
    }

    listing.is_featured = isFeatured;
    this.artisansSignal.set([...this.artisansSignal()]);
    this.persistSessionState();

    return {
      success: true,
      id,
      is_featured: isFeatured,
      message: `Artisan business listing ${isFeatured ? 'marked as featured' : 'unfeatured'}.`,
    };
  }

  getShowcaseProducts(params: { status?: string; listing_id?: number } = {}): AdminArtisanProductItem[] {
    this.assertDevelopmentPreviewAccess();

    const productsMap = this.artisanProductsSignal();
    let allProducts: AdminArtisanProductItem[] = [];

    if (params.listing_id) {
      allProducts = productsMap[params.listing_id] || [];
    } else {
      for (const list of Object.values(productsMap)) {
        allProducts.push(...list);
      }
    }

    if (params.status && params.status !== 'all') {
      allProducts = allProducts.filter((p) => p.approval_status === params.status);
    }

    return allProducts;
  }

  approveShowcaseProduct(id: number, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewArtisans(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can approve showcase products.');
    }

    const productsMap = this.artisanProductsSignal();
    let found = false;

    for (const listingId of Object.keys(productsMap)) {
      const p = productsMap[Number(listingId)].find((item) => item.id === id);
      if (p) {
        p.approval_status = 'approved';
        p.is_active = true;
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`HTTP 404 Not Found: Showcase product #${id} not found.`);
    }

    this.artisanProductsSignal.set({ ...productsMap });
    this.persistSessionState();

    return {
      success: true,
      id,
      approval_status: 'approved',
      message: 'Showcase product approved successfully.',
    };
  }

  rejectShowcaseProduct(id: number, payload?: ArtisanRejectionPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canReviewArtisans(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can reject showcase products.');
    }

    const productsMap = this.artisanProductsSignal();
    let found = false;

    for (const listingId of Object.keys(productsMap)) {
      const p = productsMap[Number(listingId)].find((item) => item.id === id);
      if (p) {
        p.approval_status = 'rejected';
        p.is_active = false;
        p.rejection_reason = payload?.reason || 'Rejected by administrator';
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`HTTP 404 Not Found: Showcase product #${id} not found.`);
    }

    this.artisanProductsSignal.set({ ...productsMap });
    this.persistSessionState();

    return {
      success: true,
      id,
      approval_status: 'rejected',
      message: 'Showcase product rejected.',
    };
  }

  getArtisanReviews(listingId?: number): AdminArtisanReviewItem[] {
    this.assertDevelopmentPreviewAccess();

    let reviews = this.artisanReviewsSignal();
    if (listingId) {
      reviews = reviews.filter((r) => r.listing_id === listingId);
    }
    return reviews;
  }

  moderateArtisanReview(id: number, payload: ArtisanReviewModerationPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canModerateArtisanReviews(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can moderate customer reviews.');
    }

    const reviews = this.artisanReviewsSignal();
    const rev = reviews.find((r) => r.id === id);
    if (!rev) {
      throw new Error(`HTTP 404 Not Found: Artisan review #${id} not found.`);
    }

    rev.is_published = payload.is_published;
    this.artisanReviewsSignal.set([...reviews]);
    this.persistSessionState();

    const statusStr = payload.is_published ? 'published' : 'hidden';
    return {
      success: true,
      review_id: id,
      is_published: payload.is_published,
      message: `Review #${id} successfully ${statusStr}.`,
    };
  }

  getArtisanKPIs(): AdminArtisanBusinessKPIs {
    this.assertDevelopmentPreviewAccess();

    const items = this.artisansSignal();
    return {
      total_businesses: items.length,
      approved_count: items.filter((a) => a.approval_status === 'approved').length,
      pending_count: items.filter((a) => a.approval_status === 'pending').length,
      rejected_count: items.filter((a) => a.approval_status === 'rejected').length,
      suspended_count: items.filter((a) => a.approval_status === 'suspended').length,
      verified_count: items.filter((a) => a.is_verified).length,
      featured_count: items.filter((a) => a.is_featured).length,
    };
  }

  // =========================================================================
  // PHASE 04C: BOOKING MANAGEMENT
  // =========================================================================

  getBookings(params: BookingQueryParams = {}): {
    items: AdminBookingListItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } {
    this.assertDevelopmentPreviewAccess();

    const actor = this.adminAuthService.currentUser();
    if (!canViewBookings(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can view booking records.');
    }

    let items = [...this.bookingsSignal()];

    if (params.category && params.category !== 'all') {
      items = items.filter((b) => b.category === params.category);
    }

    if (params.status && params.status !== 'all') {
      items = items.filter((b) => b.booking_status === params.status);
    }

    if (params.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      items = items.filter(
        (b) =>
          b.booking_reference.toLowerCase().includes(term) ||
          b.traveler_name.toLowerCase().includes(term) ||
          b.traveler_email.toLowerCase().includes(term) ||
          b.provider_name.toLowerCase().includes(term) ||
          (b.provider_business_name && b.provider_business_name.toLowerCase().includes(term)) ||
          b.service_title.toLowerCase().includes(term)
      );
    }

    if (params.date_from) {
      items = items.filter((b) => b.start_date >= params.date_from!);
    }

    if (params.date_to) {
      items = items.filter((b) => b.start_date <= params.date_to!);
    }

    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paged,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  }

  getBookingById(id: string | number): AdminBookingDetailResponse {
    this.assertDevelopmentPreviewAccess();

    const actor = this.adminAuthService.currentUser();
    if (!canViewBookings(actor)) {
      throw new Error('HTTP 403 Forbidden: Only authorized administrators can view booking dossiers.');
    }

    const booking = this.bookingsSignal().find(
      (b) => String(b.id) === String(id) || b.booking_reference === String(id)
    );

    if (!booking) {
      throw new Error(`HTTP 404 Not Found: Booking #${id} not found.`);
    }

    return {
      ...booking,
      number_of_guests: 2,
      special_requests: 'None specified. Standard itinerary requested.',
      cancellation_policy: 'Standard CeylonGo platform policy: full refund up to 48 hours before check-in/service.',
      security_deposit: booking.category === 'rental' ? 15000 : undefined,
      audit_history: [
        {
          status: 'created',
          changed_at: booking.created_at,
          notes: 'Booking created and reservation slot reserved.',
        },
        {
          status: booking.booking_status,
          changed_at: booking.created_at,
          notes: `Booking moved to status: ${booking.booking_status}`,
        },
      ],
    };
  }

  getBookingKPIs(): AdminBookingKPIs {
    this.assertDevelopmentPreviewAccess();

    const bookings = this.bookingsSignal();
    return {
      total_bookings: bookings.length,
      confirmed_bookings: bookings.filter((b) => b.booking_status === 'confirmed').length,
      pending_bookings: bookings.filter((b) => b.booking_status === 'pending').length,
      completed_bookings: bookings.filter((b) => b.booking_status === 'completed').length,
      cancelled_or_disputed: bookings.filter(
        (b) => b.booking_status === 'cancelled' || b.booking_status === 'refund_pending'
      ).length,
    };
  }

  // ==========================================
  // MODULE 12: PAYMENTS & REFUNDS
  // ==========================================
  getFinancialSummary(): AdminFinancialSummaryResponse {
    this.assertDevelopmentPreviewAccess();
    return this.financialSummarySignal();
  }

  getPayments(params: PaymentQueryParams = {}): {
    items: AdminPaymentTransactionItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } {
    this.assertDevelopmentPreviewAccess();

    let list = [...this.paymentsSignal()];

    if (params.status && params.status !== 'all') {
      list = list.filter((p) => p.payment_status === params.status);
    }
    if (params.category && params.category !== 'all') {
      list = list.filter((p) => p.category === params.category);
    }
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.transaction_reference.toLowerCase().includes(q) ||
          p.booking_reference.toLowerCase().includes(q) ||
          p.traveler_name.toLowerCase().includes(q) ||
          p.provider_name.toLowerCase().includes(q)
      );
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.page_size || 20);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = list.slice((page - 1) * pageSize, page * pageSize);

    return { items, total, page, page_size: pageSize, total_pages: totalPages };
  }

  // ==========================================
  // MODULE 13: COMMUNITY MANAGEMENT
  // ==========================================
  getCommunityReports(params: CommunityQueryParams = {}): AdminCommunityReportListResponse {
    this.assertDevelopmentPreviewAccess();

    let list = [...this.communityReportsSignal()];

    if (params.status && params.status !== 'all') {
      list = list.filter((r) => r.status === params.status);
    }
    if (params.entity_type && params.entity_type !== 'all') {
      list = list.filter((r) => r.entity_type === params.entity_type);
    }
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          r.reported_user_name.toLowerCase().includes(q) ||
          r.reporter_name.toLowerCase().includes(q)
      );
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.page_size || 20);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = list.slice((page - 1) * pageSize, page * pageSize);

    return { items, total, page, page_size: pageSize, total_pages: totalPages };
  }

  reviewCommunityReport(id: number, payload: ModerateContentPayload, admin?: AdminUser | null) {
    this.assertDevelopmentPreviewAccess();

    const actor = admin || this.adminAuthService.currentUser();
    if (!canModerateCommunity(actor)) {
      throw new Error('HTTP 403 Forbidden: Content Moderator or Super Admin authority required.');
    }

    const report = this.communityReportsSignal().find((r) => r.id === id);
    if (!report) {
      throw new Error(`HTTP 404 Not Found: Community report #${id} not found.`);
    }

    report.status = 'actioned';
    report.action_taken = payload.action;
    report.moderator_notes = payload.reason;
    report.reviewed_at = new Date().toISOString();

    this.communityReportsSignal.set([...this.communityReportsSignal()]);
    this.persistSessionState();

    return {
      success: true,
      id,
      action: payload.action,
      message: `Community report #${id} processed: ${payload.action}`,
    };
  }

  // ==========================================
  // MODULE 14: REPORTS & ANALYTICS
  // ==========================================
  getAnalyticsOverview(): PlatformAnalyticsOverview {
    this.assertDevelopmentPreviewAccess();
    return this.analyticsOverviewSignal();
  }

  getBookingVolume(module: string): BookingVolumeReport {
    this.assertDevelopmentPreviewAccess();
    const reports = this.analyticsOverviewSignal().recent_booking_volume;
    const match = reports.find((r) => r.module === module);
    return (
      match || {
        module: module as 'homestay' | 'rental_vehicle',
        created_from: new Date(Date.now() - 30 * 86400000).toISOString(),
        created_before: new Date().toISOString(),
        total: 0,
        by_status: [],
      }
    );
  }

  // ==========================================
  // MODULE 15: PROFILE & SETTINGS
  // ==========================================
  getAdminProfile(): AdminProfileDetails {
    this.assertDevelopmentPreviewAccess();
    return this.adminProfileSignal();
  }

  updateAdminProfile(payload: UpdateProfileRequest): AdminProfileDetails {
    this.assertDevelopmentPreviewAccess();
    const current = this.adminProfileSignal();
    const updated: AdminProfileDetails = {
      ...current,
      full_name: payload.full_name || current.full_name,
      phone: payload.phone || current.phone,
      notification_preferences: {
        ...current.notification_preferences,
        ...(payload.notification_preferences || {}),
      },
    };
    this.adminProfileSignal.set(updated);
    this.persistSessionState();
    return updated;
  }

  // ==========================================
  // MODULE 16: ADMIN MANAGEMENT & INVITATIONS
  // ==========================================
  getAdminAccounts(
    params: AdminManagementQueryParams = {},
    admin?: AdminUser | null
  ): {
    items: AdminAccountItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } {
    this.assertDevelopmentPreviewAccess();
    const actor = admin || this.adminAuthService.currentUser();
    if (!canManageAdmins(actor)) {
      throw new Error('HTTP 403 Forbidden: Super Admin authority required to manage administrator accounts.');
    }

    let list = [...this.adminAccountsSignal()];

    if (params.role && params.role !== 'all') {
      list = list.filter((a) => a.role === params.role);
    }
    if (params.status && params.status !== 'all') {
      list = list.filter((a) => a.status === params.status);
    }
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (a) => a.full_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      );
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.page_size || 20);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = list.slice((page - 1) * pageSize, page * pageSize);

    return { items, total, page, page_size: pageSize, total_pages: totalPages };
  }

  inviteAdmin(payload: AdminInvitationRequest, admin?: AdminUser | null): AdminAccountItem {
    this.assertDevelopmentPreviewAccess();
    const actor = admin || this.adminAuthService.currentUser();
    if (!canManageAdmins(actor)) {
      throw new Error('HTTP 403 Forbidden: Super Admin authority required to invite administrators.');
    }

    const newAdmin: AdminAccountItem = {
      id: this.adminAccountsSignal().length + 1,
      email: payload.email.trim().toLowerCase(),
      full_name: payload.full_name.trim(),
      role: payload.role,
      admin_role: payload.role,
      is_active: true,
      department: payload.department || 'Operations',
      created_by: actor?.email || 'admin@ceylongo.lk',
      status: 'invited',
      last_active: 'Never',
    };

    this.adminAccountsSignal.set([...this.adminAccountsSignal(), newAdmin]);
    this.persistSessionState();
    return newAdmin;
  }

  toggleAdminStatus(id: number, isActive: boolean, admin?: AdminUser | null): AdminAccountItem {
    this.assertDevelopmentPreviewAccess();
    const actor = admin || this.adminAuthService.currentUser();
    if (!canManageAdmins(actor)) {
      throw new Error('HTTP 403 Forbidden: Super Admin authority required to modify administrator status.');
    }

    const account = this.adminAccountsSignal().find((a) => a.id === id);
    if (!account) {
      throw new Error(`HTTP 404 Not Found: Administrator #${id} not found.`);
    }

    if (account.id === 1 && !isActive) {
      throw new Error('HTTP 400 Bad Request: Cannot deactivate the primary root Super Administrator.');
    }

    account.is_active = isActive;
    account.status = isActive ? 'active' : 'inactive';
    this.adminAccountsSignal.set([...this.adminAccountsSignal()]);
    this.persistSessionState();
    return account;
  }

  // ==========================================
  // MODULE 17: AUDIT LOGS
  // ==========================================
  getAuditLogs(params: AuditLogQueryParams = {}, admin?: AdminUser | null): AdminAuditLogListResponse {
    this.assertDevelopmentPreviewAccess();
    const actor = admin || this.adminAuthService.currentUser();
    if (!canViewAuditLogs(actor)) {
      throw new Error('HTTP 403 Forbidden: Super Admin authority required to inspect immutable audit logs.');
    }

    let list = [...this.auditLogsSignal()];

    if (params.action_type && params.action_type !== 'all') {
      list = list.filter((l) => l.action_type.includes(params.action_type!));
    }
    if (params.entity_type && params.entity_type !== 'all') {
      list = list.filter((l) => l.entity_type === params.entity_type);
    }
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.action_type.toLowerCase().includes(q) ||
          l.actor?.full_name.toLowerCase().includes(q) ||
          l.actor?.email.toLowerCase().includes(q)
      );
    }

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.page_size || 20);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = list.slice((page - 1) * pageSize, page * pageSize);

    return { items, total, page, page_size: pageSize, total_pages: totalPages };
  }

  // ==========================================
  // MODULE 18: SYSTEM SETTINGS
  // ==========================================
  getSystemSettings(admin?: AdminUser | null): SystemSettingsBundle {
    this.assertDevelopmentPreviewAccess();
    const actor = admin || this.adminAuthService.currentUser();
    if (!canManageSystemSettings(actor)) {
      throw new Error('HTTP 403 Forbidden: Super Admin authority required to read system settings.');
    }
    return this.systemSettingsSignal();
  }

  updateSystemSettings(
    section: 'general' | 'security' | 'service_fees' | 'notifications',
    payload: Record<string, unknown>,
    admin?: AdminUser | null
  ): SystemSettingsBundle {
    this.assertDevelopmentPreviewAccess();
    const actor = admin || this.adminAuthService.currentUser();
    if (!canManageSystemSettings(actor)) {
      throw new Error('HTTP 403 Forbidden: Super Admin authority required to update system configuration.');
    }

    const current = this.systemSettingsSignal();
    const updated: SystemSettingsBundle = {
      ...current,
      [section]: {
        ...current[section],
        ...payload,
      },
      last_updated_at: new Date().toISOString(),
      updated_by_admin: actor?.email || 'admin@ceylongo.lk',
    };

    this.systemSettingsSignal.set(updated);
    this.persistSessionState();
    return updated;
  }
}
