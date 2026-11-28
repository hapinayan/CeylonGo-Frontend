# CeylonGo — Complete GitHub Contribution & Project Tracker Audit

**Audit Period:** 2026-11-09 to 2026-11-28 (read-only)  
**GitHub Owner:** `hapinayan`  
**Repositories Audited:**
- `CeylonGo-Backend`: https://github.com/hapinayan/CeylonGo-Backend
- `CeylonGo-Frontend`: https://github.com/hapinayan/CeylonGo-Frontend
- `CeylonGo-Flutter`: https://github.com/hapinayan/CeylonGo-Flutter

**Companion Tracker Files:**
- [CEYLONGO_MEMBERWISE_TASKS.csv](CEYLONGO_MEMBERWISE_TASKS.csv) (42 `MODULE -> MILESTONE -> TASK -> SUBTASK` rows)
- [CEYLONGO_GITHUB_EVIDENCE.csv](CEYLONGO_GITHUB_EVIDENCE.csv) (240 deduplicated commit & PR evidence rows)

---

## 1. Team Overview

| Team Member | GitHub Username | Git Commit Author Name(s) & Email Aliases | Repos Contributed | Primary Non-Merge Commits | PRs Authored | Active Date Span |
|---|---|---|---|---:|---:|---|
| **Hapinayan** | `@hapinayan` | `Hapinayan <hapinayan017@gmail.com>` | Backend, Frontend, Flutter | 97 *(excl. 1 rebased dup `18daaf4` & 4 git-stash commits)* | 79 (Backend 40, Frontend 31, Flutter 8) | 2026-11-09 .. 2026-11-28 |
| **Mithushika** | `@vijayakumaran102719-eng` | `vijayakumaran102719-eng <vijayakumaran102719@gmail.com>`, `vijayakumaran102719-eng! <vijayakumaran102719@gmail.com>` | Backend, Frontend | 19 (Backend 11, Frontend 8) | 6 (Backend 5, Frontend 1) | 2026-11-10 .. 2026-11-27 |
| **Komaruthan** | *Unresolved (not observed as PR author)* | `Komaruthan <ragamaruthu@gmail.com>` | Backend, Frontend | 22 (Backend 21, Frontend 1) | 0 | 2026-11-15 .. 2026-11-24 |
| **Anushan** | *Unresolved (not observed as PR author)* | `anushan0709-del <anushan0709@gmail.com>`, `Kulenthiran Anushan <UT011134@unicomtic.com>` | Backend, Frontend | 9 (Backend 4, Frontend 5) | 0 | 2026-11-17 .. 2026-11-26 |
| **Patithiyan** | *Unresolved (not observed as PR author)* | `Patithi <patithisharan@gmail.com>` | Backend, Flutter | 6 *(+1 shared/integrated commit `414fd4cc` on `ceylon-go-patithi-backend`)* | 0 | 2026-11-10 .. 2026-11-17 *(+ 2026-11-22 PR #35)* |

### Attribution & Deduplication Notes
- **Merge vs Original Authors:** Merge commits (2 parents) are excluded from implementation commit counts.
- **Rebased Duplicate Excluded:** In `CeylonGo-Frontend`, `78c991a` and `18daaf4` (both `2026-11-10`, `feat(auth): integrate login and register with FastAPI`) are identical rebased commits; `18daaf4` is flagged as `Duplicate` in `CEYLONGO_GITHUB_EVIDENCE.csv`.
- **Git Stash Commits Excluded:** `f925102`/`7c29c5f` (`CeylonGo-Frontend`) and `a890ddf`/`44df209` (`CeylonGo-Flutter`) are `git stash` index/untracked snapshots and are excluded from feature counts.
- **Shared / Integrated Commits:**
  - Backend PR #35 (`ceylon-go-patithi-backend` -> `develop`, commit `414fd4cc`) was committed under `Hapinayan <hapinayan017@gmail.com>` for Patithiyan's provider dashboard/community/review modules; flagged as **Requires Manual Confirmation**.
  - Frontend PRs #19 (`feature/tour-guide-frontend`), #20 (`anushan`), #22 (`anushan`), #24 (`Mithushika`), #26 (`Mithushika`) were opened/merged by `@hapinayan` to integrate branches authored by Komaruthan, Anushan, and Mithushika.

---

## 2. Individual Member Contribution Reports

### 2.1 Hapinayan (`@hapinayan`)
- **Modules Developed:** Infrastructure/Migrations (`INFRA`), `TR-01` Traveler Auth & Account, `TR-02` Homestays, `TR-06` AI Planner & Recommendations, `TR-07` Social Feed (Web/Mobile), `TR-08` Interactive Map, `TR-09` Live Weather, `SP-01`..`SP-03` Service Provider Portal (Backend, Web, Mobile), `Artisan` (Backend MVP adapter & Flutter), `Admin` live integration & bug fixes.
- **Backend APIs:** Auth (`/api/v1/auth/*`, Google Sign-In, SMTP reset, `auth_version`/`credential_version` revocation), Provider registration/account/wallet (`/api/v1/providers/*`, `/api/v1/provider/wallet/*`), Unified MVP runtime (`app/main_mvp.py`), Homestays, AI Planner (`/api/v1/ai/planner/*`), Recommendations (`/api/v1/recommendations/*`), Map (`/api/v1/map/*`), Weather (`/api/v1/weather/*`).
- **Frontend Pages/Components:** Traveler homepage (`traveler-home`), auth UI & `auth.interceptor.ts`, provider registration steps 1–4 & `provider-dashboard`, `homestay-discovery`/`detail`/`booking-review`, `interactive-map`, `live-weather`, `recommendations`, `traveler-account`, `about`, `contact`, plus uncommitted Admin Website live fixes (`AdminPreviewStateService`, zoneless `ChangeDetectorRef` fixes across 9 Admin components, `admin-verifications` 422 fix, `admin-profile` preferences fix).
- **Flutter Screens/Integrations:** App skeleton, `home`, `community`, `profile`, `artisan`, `ai_planner`, `recommendations`, `map`, `weather`, `vendor` (provider mobile app), and full MVP backend integration (`0c712ac`).
- **Database & Migrations:** `scripts/migrate.py`, `app/core/database_guard.py`, migrations `001`–`006`, `012`–`015`, `040`, `043`–`044`, and `Academic MVP V1.1` unified schema alignment.
- **Branches & PRs:** `main`, `develop`, `HAPINAYAN-FINAL`, `feature/hapi-frontend`, `feature/provider-mobile-ui`, `docs/academic-mvp-v1.1`, plus 79 PRs across all 3 repos (Backend #1–13, #15, #17–25, #27–28, #30–43, #45; Frontend #1, #3–23, #25–31; Flutter #1–8).
- **Date Range:** `2026-11-09` to `2026-11-28`.
- **Key Commits:** `6bc9549`, `cd8922b`, `f339075`, `eae2e04`, `e581896`, `b45c058`, `2c7c0b1`, `ce8a3b8`, `b0d63a1`, `c0ab7c8`, `8dcda19`, `0c712ac`.
- **Remaining / Incomplete:** Uncommitted local changes in `CeylonGo-Backend` (`HAPINAYAN-FINAL`) and `CeylonGo-Frontend-Homepage` (`feature/hapi-frontend`); live ordinary-admin invitation activation test pending Chrome remote debugging approval.

### 2.2 Mithushika (`@vijayakumaran102719-eng`)
- **Modules Developed:** `TR-01` Initial Auth UI, `TR-02` Initial Homestay Backend, `TR-03` Rental Module 09 Backend, `TR-04` Activities/Slots Backend, `TR-05` Tour Guide Module 05 Backend, `TR-07` Community Backend (`039`), `Artisan` Frontend, `AD-01` & `AD-02` Admin Backend & Frontend (all 18 Admin modules + RBAC + V1.0.10 invitations + MVP seeder).
- **Backend APIs:** `app/routers/homestay.py`, `activity_bookings.py`, `rental_*.py`, `admin_tour_guides.py`, `community.py`, `admin_auth.py`, `admin_management.py`, `mvp/admin.py`, `mvp/admin_directories.py`.
- **Frontend Pages/Components:** Initial `login`/`register` UI (`1d3b041`, `ba1e017`), `artisan` frontend (`d6c9814`), complete `src/app/admin/*` module (18 pages, guards, interceptors, services, modals), `about`/`contact` (`Mithushika` branch PR #26).
- **Database & Migrations:** `007`–`011` (Homestay), `019` (Rentals), `021` (Activities), `022` (Tour Guides), `028`/`039` (Community), `admin_invitations` (V1.0.10), and `scripts/seed_mvp.py`.
- **Branches & PRs:** `Mithushika`, `feature/admin-frontend`, `feature/admin-completion-frontend`, `feature/admin-completion-backend`, `feature/activities-experiences-backend`, `feature/tour-guide-backend-complete`, `feature/travel-community-backend`; PRs: Backend #14, #16, #26, #29, #44 (closed), Frontend #32 (merged).
- **Date Range:** `2026-11-10` to `2026-11-27`.
- **Key Commits:** `e1918c0`, `8975c1f`, `5e2097c`, `f0de11c`, `afb1505`, `3092d5c`, `7c674b8`, `a5e0a86`, `c6e4394`, `1d3b041`, `d6c9814`, `e7ba4d5`, `bab5d5b`, `797833a`.

### 2.3 Komaruthan (`Komaruthan <ragamaruthu@gmail.com>`)
- **Modules Developed:** Historical `Eco-Tourism` vertical (`app/routers/eco_*.py`, sponsorships, PayHere integration, weather cancellation, SQL Server staging), `M03` Activities promotions/payouts/notifications/admin reporting, and `TR-05` Local Tour Guide Traveler Frontend.
- **Backend APIs:** `eco_experiences.py`, `eco_bookings.py`, `eco_reservations.py`, `eco_slots.py`, `eco_promotions.py`, `activities_public.py`, `provider_activities.py`, `admin_activities.py`, `provider_activity_promotions.py`, `core/payhere.py`.
- **Frontend Pages/Components:** `src/app/pages/tour-guides/*`, `tour-guide.models.ts`, `tour-guide.service.ts` (`dcb4219`).
- **Database & Migrations:** `017`, `018`, `020`, `025`, `034`, `041`, `042` (Eco-tourism & M03 tables — largely excluded from active `main_mvp.py`).
- **Documentation:** `MODULE03_POST_PHASE4_REQUIREMENT_GAP_ANALYSIS.md`, `MODULE03_POST_PHASE5C_REQUIREMENT_GAP_ANALYSIS.md`, `module03_*` API contract docs, staging rehearsal reports.
- **Date Range:** `2026-11-15` to `2026-11-24` (22 non-merge commits).
- **Key Commits:** `d8be2f1`, `04ed8dd`, `0ffa962`, `3c75e42`, `3fe090d`, `910a045`, `538139f`, `e83e7ec`, `c644af5`, `dcb4219`.

### 2.4 Anushan (`anushan0709-del <anushan0709@gmail.com>` / `Kulenthiran Anushan <UT011134@unicomtic.com>`)
- **Modules Developed:** `TR-03` Bike & Bicycle Rental (Backend + Frontend), `TR-04` Experiences/Adventures Frontend, `TR-05` Tour Guide Provider Profile Backend, `TR-02..05` Unified Traveler Bookings & Traveler Wishlist Frontend.
- **Backend APIs:** `app/models/rental_vehicle.py`, `rental_booking.py`, `core/rental_capacity.py`, `app/routers/tour_guide.py`, `core/booking_transactions.py` (`f795562` TR-05 local verification).
- **Frontend Pages/Components:** `src/app/experiences/*` (`fe06b26`, `05903c3`), `src/app/bike-rentals/*` (`d78afe2`), `src/app/traveler-bookings/*` (`9c73d78`), `src/app/traveler-wishlist/*` (`ec2e34c`).
- **Documentation:** `docs/verification/EXPERIENCES_*`, `BIKE_RENTALS_*`, `TRAVELER_BOOKINGS_*`, `TRAVELER_WISHLIST_*` acceptance and API gap matrices.
- **Branches:** `anushan` (`CeylonGo-Frontend`), `feature/tr05-backend-local-complete` (`CeylonGo-Backend`); merged via Frontend PRs #20, #22.
- **Date Range:** `2026-11-17` to `2026-11-26` (9 non-merge commits).
- **Key Commits:** `a69c4a0`, `dcd5146`, `bdd61a9`, `f795562`, `fe06b26`, `05903c3`, `d78afe2`, `9c73d78`, `ec2e34c`.

### 2.5 Patithiyan (`Patithi <patithisharan@gmail.com>`)
- **Modules Developed:** `TR-01` Traveler Authentication & Password Reset Security (Backend + Flutter Mobile), plus shared/integrated Provider Dashboard, Provider Community, and Provider Reviews backend (`ceylon-go-patithi-backend`).
- **Backend APIs:** `app/core/rate_limiter.py`, `app/core/security.py`, `app/routers/auth.py` (`a1e1605`); and via PR #35 (`414fd4cc`, committed by Hapinayan): `app/routers/provider_dashboard.py`, `provider_community.py`, `provider_reviews.py`.
- **Flutter Screens/Integrations:** Auth landing, login, register, forgot password, check email, `SecureStorageService`, `MainActivity.kt` deep links, responsive auth layouts (`809732c`, `eb519db`, `86bf99a`, `89801ce`).
- **Date Range:** `2026-11-10` to `2026-11-17` (+ `2026-11-22` PR #35).
- **Attribution Note:** PR #35 (`ceylon-go-patithi-backend`) commit `414fd4cc` carries `Hapinayan` as Git author; marked as **Requires Manual Confirmation**.

---

## 3. Complete Module-wise Task Inventory

The complete 42-row hierarchy (`MODULE -> MILESTONE -> TASK -> SUBTASK`) with Task IDs, Deliverables, Priority, Complexity, Critical Path, Dependencies, Status, Progress %, Actual Dates, Evidence, and Verification Status is recorded in **[CEYLONGO_MEMBERWISE_TASKS.csv](CEYLONGO_MEMBERWISE_TASKS.csv)**.

Summary by Module:
- **INFRA (6 tasks):** FastAPI/Angular/Flutter setup, SQL Server migrations `001`–`044`, Academic MVP V1.1 unification (`main_mvp.py`), MVP seeder.
- **TR-01 (5 tasks):** Traveler JWT/Google/SMTP auth, rate limiting, Angular auth & account UI, Flutter auth & deep links.
- **TR-02 (3 tasks):** Homestays backend (legacy + MVP), Angular discovery/detail/booking UI.
- **TR-03 (3 tasks):** Rental backend (Anushan + Mithushika + MVP `rentals.py`), Angular `bike-rentals` UI.
- **TR-04 (3 tasks):** Activities backend, Eco-Tourism/M03 (Komaruthan — excluded from MVP), Angular `experiences` UI.
- **TR-05 (3 tasks):** Tour Guide backend (Anushan + Mithushika + MVP `tour_guides.py`), Angular `tour-guides` UI (Komaruthan).
- **TR-06 (3 tasks):** AI Travel Planner & Recommendations (Backend, Web, Flutter).
- **TR-07 (3 tasks):** Social Community Feed (Backend, Web, Flutter).
- **TR-08 & TR-09 (2 tasks):** Interactive Map & Live Weather (Backend, Web, Flutter).
- **Artisan (3 tasks):** Backend MVP adapter, Angular UI, Flutter module.
- **SP-01..SP-03 (3 tasks):** Provider registration/onboarding/login, Provider dashboard/reviews/community, Listing & Wallet management (Web & Flutter).
- **TR-02..05 Unified (1 task):** Traveler Bookings & Wishlist dashboards (Anushan).
- **AD-01..AD-02 (4 tasks):** Admin RBAC/Invitations backend, 18-module Admin Angular UI, today's live browser/zoneless CD fixes, and pending live invitation activation test.

---

## 4. API Contract Board (Active Academic MVP Runtime — `app/main_mvp.py`)

Total active `/api/v1` + system operations: **249** (all mounted in `create_mvp_app()`):

| Module / Tag | Operations | Key Endpoints | Auth / Role |
|---|---:|---|---|
| **System** | 2 | `GET /`, `GET /health` | Public |
| **MVP Authentication** | 13 | `/api/v1/auth/{register,login,google,logout,me,forgot-password,reset-password,verify-email,resend-email-otp}` | Public / Traveler JWT |
| **MVP Traveler Account** | 13 | `/api/v1/auth/me/avatar`, `/api/v1/auth/change-password`, `/api/v1/notifications/*`, `/api/v1/traveler/{preferences,settings/notifications}` | Traveler JWT |
| **MVP Homestays / Activities / Rentals / Tour Guides / Artisans** | 30+ | `/api/v1/{homestays,activities,rental-vehicles,tour-guides,artisan-listings}/*` + wishlist & availability | Public / Traveler JWT |
| **MVP Bookings & Payments** | 6 | `POST/GET/PATCH /api/v1/bookings*`, `POST /api/v1/payments/{simulate,at-location}` | Traveler JWT |
| **MVP AI Planner & Recommendations** | 22 | `POST /api/v1/itinerary/generate`, `/api/v1/ai/planner/{conversations,trips,booking-quotes,bookings/confirm}`, `/api/v1/recommendations/*` | Traveler JWT |
| **MVP Community** | 22 | `/api/v1/community/{feed,posts,comments,likes,reports,saved}` | Traveler JWT |
| **Map & Weather** | 4+ | `/api/v1/map/*`, `/api/v1/weather/{current,forecast,locations,search}` | Public / Traveler |
| **MVP Providers & Listing Management** | 40+ | `/api/v1/providers/{register,login,otp/*,documents,me,avatar,password/setup}`, `/api/v1/provider/{dashboard,settings,listings,bookings,wallet/*}` | Provider JWT |
| **Admin Auth, Management & Directories** | 37 | `/api/v1/admin/auth/{login,me,invitations/verify,invitations/activate}`, `/api/v1/admin/management/{admins,invitations}`, `/api/v1/admin/{dashboard,travelers,provider-directory,listing-directory,listings,bookings,payments,wallets,community,audit-log-directory}` | Admin / Super Admin JWT |

---

## 5. Scope Map

| Scope Group | Requirements | Active MVP Status |
|---|---|---|
| **Traveler Core** | `TR-01` Auth, `TR-02` Homestays, `TR-03` Rentals, `TR-04` Activities, `TR-05` Tour Guides, `TR-06` AI Planner, `TR-07` Social Feed, `TR-08` Map, `TR-09` Weather | **Implemented & Active** in `main_mvp.py`, Angular, and Flutter |
| **Service Provider** | `SP-01` Auth/Verification, `SP-02` Publish Service, `SP-03` Manage Listings & Bookings | **Implemented & Active** in `main_mvp.py`, Angular, and Flutter |
| **Admin** | `AD-01` Provider & Listing Verification, `AD-02` Travelers, Providers, Listings, Bookings, Community Moderation | **Implemented & Verified Live** (Super Admin); ordinary Admin live test pending |
| **Preserved Extensions** | `Artisan` showcase, `Provider Wallet & Commission`, `Recommendations`, `Super Admin Invitations` | **Preserved & Active** alongside Academic MVP V1.1 |
| **Out-of-Scope / Excluded** | Live PayHere gateway, real settlements/payouts, `eco_*` vertical, `homestay_campaigns`, `promotions`, `admin/reports` analytics, `admin/settings` | **Excluded** from `main_mvp.py`; legacy files preserved on disk |

---

## 6. Database Contribution Report (`CeylonGoDB` MVP V1.0.10 — 33 Tables)

Verified via read-only SQLAlchemy inspection of `CeylonGoDB`:
- **Auth & Accounts (8):** `users`, `password_resets`, `traveler_email_challenges`, `traveler_settings`, `traveler_notifications`, `traveler_activity_events`, `provider_profiles`, `provider_email_challenges`, `provider_documents` *(9 tables total)*.
- **Listings & Inventory (4):** `listings`, `listing_media`, `listing_verification`, `inventory_units`, `availability_slots`, `homestay_wishlist` *(6 tables total)*.
- **Bookings, Payments & Wallet (6):** `bookings`, `booking_allocations`, `booking_status_history`, `booking_payments`, `provider_wallets`, `wallet_transactions`.
- **Community (6):** `community_posts`, `community_post_media`, `community_post_likes`, `community_comments`, `community_saved_posts`, `community_reports`.
- **AI Planner (3):** `ai_conversations`, `ai_conversation_turns`, `ai_saved_trips`.
- **Admin & Schema Versioning (3):** `admin_invitations`, `admin_audit_logs`, `mvp_schema_versions`.

*(Historical migrations `001` through `044` in `CeylonGo-Backend/migrations/` were contributed by Hapinayan, Mithushika, Komaruthan, and Anushan prior to schema consolidation into the 33-table `CeylonGoDB` V1.0.10.)*

---

## 7. Testing and Verification Report

| Layer | Evidence Observed | Result |
|---|---|---|
| **Backend Admin Auth & Invitations** | `pytest tests/test_mvp_admin_invitations.py tests/test_mvp_admin_auth.py -q` | **30 passed** (2026-11-28) |
| **Backend Historical & MVP Suites** | 120+ `tests/test_*.py` files in `CeylonGo-Backend/tests/` | Present in repo; full suite not re-run in this audit |
| **Frontend Admin Unit Suite** | `npx ng test --watch=false --include "src/app/admin/**/*.spec.ts"` | **54/54 files passed, 389/389 tests passed, 0 errors** (2026-11-28) |
| **Frontend TypeScript Check** | `npx tsc --noEmit` | **Passed** (exit code 0, 2026-11-28) |
| **Frontend Live Browser (Super Admin)** | Chrome DevTools verification across all 18 `/admin/*` routes + login/logout/refresh/guards | **18/18 routes rendered cleanly**, 0 console errors, 0 failed API calls (2026-11-28) |
| **Flutter Test Suite** | 33 `test/*_test.dart` files in `CeylonGo-Flutter/test/` | Present in repo; not executed in this audit |

---

## 8. Pending Tasks and Blockers

1. **Live Admin Invitation Activation & Ordinary Admin Browser Test (Blocked on Chrome Remote Debugging):**
   - `hapinayan017+test@gmail.com` is confirmed unregistered in `CeylonGoDB`.
   - Sending the live invitation via Chrome timed out waiting for **"Allow remote debugging?"** confirmation.
   - Once sent and manually activated by the user, ordinary `admin` login, operational permissions, Super Admin route/API restrictions, and single-use link invalidation remain to be verified live.
2. **Uncommitted Local Changes:**
   - Both `CeylonGo-Backend` (`HAPINAYAN-FINAL`) and `CeylonGo-Frontend-Homepage` (`feature/hapi-frontend`) hold uncommitted Academic MVP V1.1 & Admin integration fixes (preserved untouched per instructions).

---

## 9. GitHub Evidence Register

- **Total Deduplicated Evidence Rows:** **240** in [CEYLONGO_GITHUB_EVIDENCE.csv](CEYLONGO_GITHUB_EVIDENCE.csv):
  - `CeylonGo-Backend`: 45 branches, 45 PRs (44 merged, 1 closed), 84 non-merge commits.
  - `CeylonGo-Frontend`: 21 branches, 32 PRs (31 merged, 1 closed), 43 non-merge commits (1 duplicate `18daaf4` + 2 stash snapshots flagged).
  - `CeylonGo-Flutter`: 8 branches (1 remote-only `feature/flutter-home-community-profile-artisan`), 8 PRs (8 merged), 28 non-merge commits (2 stash snapshots flagged).

---

## 10. Historical Scope and MVP Reconciliation Report

| Area | Historical Implementation (Pre-2026-11-23) | Current Academic MVP V1.1 (`main_mvp.py` & `CeylonGoDB V1.0.10`) |
|---|---|---|
| **Runtime Entrypoint** | `app/main.py` mounting 40+ vertical routers | `app/main_mvp.py` (`create_mvp_app()`) mounting unified `mvp/*` routers |
| **Vertical Silos** | Separate tables & routers for `eco_*`, `homestay_campaigns`, `promotions`, `showcase_items`, `artisan_*` | Consolidated into unified `listings`, `listing_media`, `listing_verification`, `inventory_units`, `availability_slots`, `bookings` |
| **Payments** | Live PayHere webhook/checkout & automated settlements (`core/payhere.py`, `eco_payments_proposed.py`) | Simulated Online Payment & Pay at Location (`mvp/payments.py`), plus provider wallet/commission ledger |
| **Admin Portal** | Legacy per-vertical admin endpoints (`/admin/homestays/*`, `/admin/rentals/*`, `/admin/reports`, `/admin/settings`) | Unified `/api/v1/admin/listing-directory`, `/provider-directory`, `/audit-log-directory`, `/management/*`, and `/wallets/*`; reports & settings marked unavailable in MVP |

---

## Limitations & Unresolved Items
1. **Unresolved GitHub Usernames:** Only `@hapinayan` and `@vijayakumaran102719-eng` appear as GitHub PR authors; GitHub usernames for **Patithiyan**, **Anushan**, and **Komaruthan** cannot be verified from PR metadata alone (only their Git author names/emails are observed).
2. **Manual Confirmation Required:** Backend PR #35 (`ceylon-go-patithi-backend`, commit `414fd4cc`) is authored by `Hapinayan` in Git metadata but named for Patithiyan's modules.
3. **Uncommitted Working Tree:** Local working-tree changes in `CeylonGo-Backend` and `CeylonGo-Frontend-Homepage` are not yet pushed to GitHub.
4. **Due Dates & Original Estimates:** No sprint due dates or story-point estimates exist in the repositories, so `Due Date` is marked `Not Specified in Repo`.
