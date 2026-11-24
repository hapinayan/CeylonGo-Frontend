# Experiences final frontend handoff

Scope: Experiences Discover and Details, Eco-Tourism, Weather, Saved Experiences, reservation workflow, history and cancellation, and read-only payment status with gated checkout preparation. Local frontend completion was verified. Live acceptance and production readiness remain open.

## Routes and contracts

- `/experiences` and `/experiences/:id` provide Discover and Details. `/experiences/wishlist`, `/experiences/:id/book`, `/experiences/bookings`, and `/experiences/bookings/:bookingId` provide the traveler workflow.
- Fixture server at [localhost:4201](http://localhost:4201/experiences) with [sample Details](http://localhost:4201/experiences/safari), [Wishlist](http://localhost:4201/experiences/wishlist), [sample booking](http://localhost:4201/experiences/safari/book), and [booking history](http://localhost:4201/experiences/bookings). The first fixture reservation creates `/experiences/bookings/1` in that tab.
- [API-mode preview](http://localhost:4202/experiences) was browser-tested with local interception. Outside that harness it targets the configured loopback API.
- See the [local report](EXPERIENCES_FRONTEND_LOCAL_REPORT.md) for verified endpoints and evidence, and the [matrix](EXPERIENCES_FINAL_ACCEPTANCE_MATRIX.md) for per-feature status. Backend source remains clean at `f795562e352a48c6d7cf9a6d5ffa2265352797ec`.

## Final verification

Production build passed with the existing 38.55 kB provider registration stylesheet warning against its 24 kB budget. Angular tests returned 229 passed, 0 failed and 0 skipped across 22 files. `git diff --check` passed. Node 26.8.1 was used because Node 24.x was unavailable. Chrome verified the complete fixture flow, no horizontal overflow at the five requested widths, search state restoration, keyboard and modal behavior, auth/guard routes, and API-mode anonymous and error states with no backend egress.

The security review verified origin-scoped authorization, anonymous header stripping, stale-401 isolation, traveler/session ownership checks and active request cancellation. Booking retries are manual and constrained by uncertainty; cancellation requires an authoritative read after an unknown result. Payment status is server-authoritative. No signing occurs in the browser. Production JavaScript excludes fixture records.

## Owner sequence

1. Use the [runbook](EXPERIENCES_LOCAL_ACCEPTANCE_RUNBOOK.md) to approve an isolated backend, Node 24.x verification, seed data, owners and test travelers. Verify public Eco reads, wishlist ownership, reservation capacity and concurrency, cancellation and reconciliation.
2. Verify weather through a controlled upstream stub and settle cross-origin `Retry-After` handling.
3. Approve and deliver the [general Activities backend handoff](EXPERIENCES_BACKEND_HANDOFF.md), including catalog and taxonomy, summary fields, traveler-aware availability and durable idempotency.
4. Approve the PayHere sandbox merchant, checkout destination and callback reconciliation with finance and security before enabling UI checkout. See [external acceptance](EXPERIENCES_EXTERNAL_ACCEPTANCE.md).

## Git handoff

Proposed commit message: `feat(experiences): complete traveler workflows and local acceptance`

Proposed pull request description: Implements the Experiences Discover and Details flow, Eco and weather reads, traveler wishlists, reservation review, history and cancellation, and server-authoritative payment status. Adds isolated fixtures, 229 passing tests and responsive Chrome evidence. External runtime, General Activities contracts and checkout activation remain open. The existing provider SCSS budget warning remains.

Exact recommended paths below encompass the accumulated approved Experiences work. No staging was performed.

- `angular.json`
- `docs/verification/EXPERIENCES_BACKEND_GAPS.md`
- `docs/verification/EXPERIENCES_BACKEND_HANDOFF.md`
- `docs/verification/EXPERIENCES_EXTERNAL_ACCEPTANCE.md`
- `docs/verification/EXPERIENCES_FINAL_ACCEPTANCE_MATRIX.md`
- `docs/verification/EXPERIENCES_FINAL_HANDOFF.md`
- `docs/verification/EXPERIENCES_FRONTEND_LOCAL_REPORT.md`
- `docs/verification/EXPERIENCES_LOCAL_ACCEPTANCE_RUNBOOK.md`
- `src/app/app.routes.ts`
- `src/app/core/interceptors/auth.interceptor.spec.ts`
- `src/app/core/interceptors/auth.interceptor.ts`
- `src/app/experiences/components/booking-panel.html`
- `src/app/experiences/components/booking-panel.ts`
- `src/app/experiences/components/category-nav.ts`
- `src/app/experiences/components/experience-card.ts`
- `src/app/experiences/components/icon.ts`
- `src/app/experiences/components/pagination.ts`
- `src/app/experiences/components/payment-status.ts`
- `src/app/experiences/components/save-control.ts`
- `src/app/experiences/components/traveler-header.ts`
- `src/app/experiences/components/weather-panel/weather-panel.html`
- `src/app/experiences/components/weather-panel/weather-panel.scss`
- `src/app/experiences/components/weather-panel/weather-panel.ts`
- `src/app/experiences/experiences.routes.ts`
- `src/app/experiences/models/catalog.ts`
- `src/app/experiences/models/eco.ts`
- `src/app/experiences/models/travel.ts`
- `src/app/experiences/models/weather.ts`
- `src/app/experiences/pages/details/details.html`
- `src/app/experiences/pages/details/details.scss`
- `src/app/experiences/pages/details/details.ts`
- `src/app/experiences/pages/discover/discover.html`
- `src/app/experiences/pages/discover/discover.scss`
- `src/app/experiences/pages/discover/discover.spec.ts`
- `src/app/experiences/pages/discover/discover.ts`
- `src/app/experiences/pages/discover/live-catalog.ts`
- `src/app/experiences/pages/traveler/booking-create.ts`
- `src/app/experiences/pages/traveler/booking-detail.ts`
- `src/app/experiences/pages/traveler/bookings.ts`
- `src/app/experiences/pages/traveler/traveler.scss`
- `src/app/experiences/pages/traveler/wishlist.ts`
- `src/app/experiences/services/catalog.ts`
- `src/app/experiences/services/catalog-provider.development.ts`
- `src/app/experiences/services/catalog-provider.ts`
- `src/app/experiences/services/discover-view-state.ts`
- `src/app/experiences/services/eco-api.ts`
- `src/app/experiences/services/reservation-write-lock.ts`
- `src/app/experiences/services/travel-api.ts`
- `src/app/experiences/services/travel-session.ts`
- `src/app/experiences/services/weather-api.ts`
- `src/app/experiences/services/wishlist-state.ts`
- `src/app/experiences/services/workflow-state.ts`
- `src/app/experiences/testing/demo-experiences.ts`
- `src/app/experiences/testing/demo-travel.ts`
- `src/app/experiences/testing/demo-weather.ts`
- `src/app/experiences/testing/eco-integration.spec.ts`
- `src/app/experiences/testing/traveler-workflows.spec.ts`
- `src/app/experiences/testing/weather-panel.spec.ts`
