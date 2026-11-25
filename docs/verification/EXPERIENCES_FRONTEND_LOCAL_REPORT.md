# Experiences frontend local evidence

Frontend branch: `feature/experiences-frontend`. Backend source: `feature/tr05-backend-local-complete` at `f795562e352a48c6d7cf9a6d5ffa2265352797ec`. Backend working tree verified clean.

## Completed batches

| Phase | Local implementation |
|---|---|
| 05 | Saved Experiences, temporary development favorites, shared Discover/Details heart state, traveler-scoped hydration, optimistic rollback, duplicate-add and missing-remove reconciliation, server paging and availability filter, and sign-in and retry states. |
| 06 | Details availability, Sri Lanka date/time and capacity, typed booking form, conditional ages, safety acceptance, review, estimate and server-confirmed total, duplicate request prevention and conflict refresh. An uncertain or abandoned submission remains locked for that traveler and slot in the current browser application session. |
| 07 | Traveler-owned booking history and detail, server paging, unavailable and retry states, cancellation dialog with an optional reason and server-confirmed outcome. Paid cancellation and refunds remain separate acceptance work. |
| 08 | Reusable payment status panel with authoritative amount, method and status, optional payment metadata, manual refresh and pending messaging. The typed initiation method is present. Checkout UI is disabled and there is no external handoff. |

## Verified backend API contracts

Paths below are relative to `/api/v1`. Verification was read-only source inspection and frontend HTTP mocks.

| Method and path | Request and response | Constraints |
|---|---|---|
| GET `/wishlists/me` | `page`, `page_size`, `available_only` → `EcoWishlistPagination`, including items, count, page metadata and nullable public experience summary. | Authenticated traveler; own entries only. Provider suspension behavior remains an acceptance check. |
| POST / DELETE `/wishlists/eco/{experience_id}` | Integer ID, no body → saved entry (201) or no content (204). | Traveler owner. Add returns 404 for unknown or unapproved and 400 for unpublished listings. Duplicate add returns 409. Remove returns 404 for a missing owned entry. |
| GET `/eco-experiences/{experience_id}/availability` | Public integer ID, optional `day`, `page`, `page_size` → open slot array with capacity, remaining places and UTC timestamps. | Date within 365 Lanka calendar days, active future slots, listing eligibility and applicable season restrictions. No participant-count filter. |
| POST `/eco-reservations` | Slot ID, participant count, safety acceptance and optionally ages and sponsored token → 201 `EcoReservationResponse`. | Traveler. Backend validates eligibility and capacity, holds the slot and calculates total. Relevant failures include 401/403, 404, 409 and 422. No idempotency key or automatic retry. |
| GET `/eco-reservations/me` and `/eco-reservations/{booking_id}` | History takes `page`, `page_size` and returns an array. Detail takes integer ID and returns one reservation with reference, slot, participant count, status, payment fields, total and currency. | Traveler owner. Missing and unowned detail share 404. History has no server count and only supplies a listing ID. |
| POST `/eco-reservations/{booking_id}/cancel` | Optional trimmed reason, max 500 chars → updated reservation. | Traveler owner. Pending or confirmed and unpaid before start. The backend checks the saved cancellation window. 409 can indicate a state or policy conflict. |
| GET `/eco-reservations/{booking_id}/payments/status` | Integer booking ID → `PaymentStatusResponse` with amount, currency, statuses, method and optional paid timestamp and transaction ID. | Traveler owner. 404 for missing or unowned. Server state is authoritative. |
| POST `/eco-reservations/{booking_id}/payments/initiate` | Integer booking ID and no body → backend-generated `PaymentInitiateResponse` including signed checkout fields. | Traveler owner. Needs native Eco payment activation and an eligible confirmed, unpaid future reservation. Can return 404, 409 or 503. UI never calls it. PayHere callback processing remains on the backend. |

Source anchors in the backend checkout include `app/main.py`, `app/routers/wishlists.py`, `app/routers/eco_reservations.py`, `app/routers/payments.py`, `app/schemas/eco_wishlist.py`, `app/schemas/eco_reservation.py`, `app/schemas/payment.py`, `app/services/eco_reservations.py`, and `app/services/eco_native_payments.py`.

## Routes and components

- Discover and Details remain at [Discover](http://localhost:4201/experiences) and [sample Details](http://localhost:4201/experiences/safari).
- New routes include [Saved Experiences](http://localhost:4201/experiences/wishlist), [sample booking form](http://localhost:4201/experiences/safari/book), and [booking history](http://localhost:4201/experiences/bookings). The [sample reservation detail](http://localhost:4201/experiences/bookings/1) is available after creating the first sample reservation in that tab.
- Static wishlist and booking history routes precede dynamic listing routes. The feature adds the four traveler pages, Save Control, Booking Panel and Payment Status, typed traveler API models, session and wishlist state, a reservation write lock, and an in-memory development workflow source.
- Production requests target only the configured API. Private reads and mutations require the traveler session in the UI, and server ownership remains authoritative. Account changes hide previous results and cancel stale reads. The existing origin-scoped interceptor, auth routes and provider guard remain in use.

## Local command and browser evidence

| Check | Result |
|---|---|
| `npm.cmd run build` | Passed. Existing provider registration SCSS warning remains at 38.55 kB against a 24 kB warning budget. |
| `npm.cmd test -- --watch=false` | 226 passed, 0 failed, 0 skipped across 22 files. Baseline was 216 passed across 21 files. |
| `git diff --check` and `git status --short` | Passed whitespace check and reviewed working-tree status. Existing frontend phase changes remain present. Backend working tree clean. |
| Runtime | Node v26.8.1. Node 24.x was unavailable. Angular 21 supported-runtime verification remains open. |
| Browser | Headless Chrome verified Discover, Details, Weather, wishlist synchronization, availability, booking form and review, sample confirmation, booking history, reservation Details, sample cancellation and payment status, /auth and the provider-dashboard guard. |
| Responsive and accessible controls | No horizontal overflow at 1440, 1200, 800, 375 or 320 px on the verified Experiences screens and dialog. Discover cards used four, two and one column layouts. Keyboard focus, reduced motion and modal focus entry checked. |
| Fixture isolation | Browser network instrumentation recorded zero backend API, weather-provider, and PayHere calls during the fixture journey. Production JavaScript contained no catalog, weather or traveler fixture markers. |

## Remaining work

Live acceptance requires an authorized isolated backend, test travelers and data, supported Node runtime verification, and owner-approved payment sandbox and callback configuration. See [external acceptance](EXPERIENCES_EXTERNAL_ACCEPTANCE.md). General Activities contracts, booking aggregate metadata, safe list summaries, explicit cancellation eligibility, maximum-age visibility, and durable idempotency remain backend dependencies in [the gap matrix](EXPERIENCES_BACKEND_GAPS.md). The current browser lock is session-scoped and cannot prove the outcome of an uncertain request. Production readiness remains unverified.



## Final completion pass

- Final regression: 229 passed, 0 failed, 0 skipped across 22 files. Baseline for this pass was 226 across 22. Build passed with the existing provider SCSS budget warning, and the Git whitespace check passed. Node 26.8.1 was the only available runtime.
- Fixed Discover route restoration, duplicate filter inputs in empty results, stale 401 session invalidation, authorization on explicitly anonymous requests, slot date reconciliation, cancellation unlock after failed refresh, and weather attribution/cooldown. Mobile favorite actions now have 44 px targets.
- Chrome fixture verification covered search and category selection, empty state, return from Details, weather selection and failure, saved state, availability, review, reservation, payment, cancellation, width checks, keyboard/modal focus, authentication and provider guard. CDP browser API-mode verification intercepted all backend requests, proving 503-to-empty retry without fixture fallback and anonymous private route gating. No real API or provider requests were sent.
- Production JavaScript scan found no catalog, weather or traveler fixture records. Live acceptance remains open. See the [final matrix](EXPERIENCES_FINAL_ACCEPTANCE_MATRIX.md), [owner runbook](EXPERIENCES_LOCAL_ACCEPTANCE_RUNBOOK.md), and [Git handoff](EXPERIENCES_FINAL_HANDOFF.md).
