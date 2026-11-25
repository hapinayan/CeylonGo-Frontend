# Experiences final acceptance matrix

This matrix distinguishes local browser and HTTP-mock evidence from an authorized backend run. No real transactions or external provider requests were made. Status vocabulary includes IMPLEMENTED_AND_LOCALLY_VERIFIED, IMPLEMENTED_RUNTIME_ACCEPTANCE_PENDING, BLOCKED_BY_BACKEND_CONTRACT, BLOCKED_BY_EXTERNAL_APPROVAL, NOT_IMPLEMENTED, and FAILED_VERIFICATION.

| Requirement | Status | Evidence or dependency |
|---|---|---|
| Discover search, categories, filtering, pagination, empty state, navigation restoration | IMPLEMENTED_AND_LOCALLY_VERIFIED | Chrome fixture search for zero results and Yala, wildlife category and back navigation. Discover and Eco integration specs cover sorting, server paging, stale queries and filtering. |
| API-mode error, retry and empty states | IMPLEMENTED_AND_LOCALLY_VERIFIED | Chrome intercepted browse 503 then a successful empty reply. The error and retry rendered without fixture fallback or duplicate filter forms. |
| Eco details, catalog and availability against real backend | IMPLEMENTED_RUNTIME_ACCEPTANCE_PENDING | Verified routes at the pinned commit. Eco integration spec and Chrome fixture verify local behavior. The isolated Eco runtime gate remains open. |
| Weather conditions, forecast, ambiguity, attribution, stale and error handling | IMPLEMENTED_AND_LOCALLY_VERIFIED | Weather panel HTTP specs and fixture Chrome journey, including unavailable weather while Details stayed usable. |
| Weather timeout, throttle and CORS acceptance | IMPLEMENTED_RUNTIME_ACCEPTANCE_PENDING | Mocked HTTP covers timeout, stale requests and throttling. Controlled upstream and cross-origin header verification remain open. |
| Shared wishlist, logout, account switching and anonymous access | IMPLEMENTED_AND_LOCALLY_VERIFIED | Traveler workflow and interceptor specs, stale 401 regression, Chrome fixture hearts and API-mode sign-in states with zero private requests. |
| Persistent wishlist and owner isolation on real backend | IMPLEMENTED_RUNTIME_ACCEPTANCE_PENDING | Needs authorized two-traveler runtime with published and unavailable listings. |
| Booking date, slot, age, capacity, safety, review and confirmation | IMPLEMENTED_AND_LOCALLY_VERIFIED | Traveler workflow specs and Chrome fixture reservation. Mocked totals are authoritative only to the fixture or supplied HTTP response. |
| Reservation conflict recovery, duplicate prevention and uncertain outcomes | IMPLEMENTED_AND_LOCALLY_VERIFIED | Traveler workflow HTTP specs. In-memory lock survives route recreation; there is no durable backend idempotency. |
| Real reservation concurrency, history ownership and cancellation windows | IMPLEMENTED_RUNTIME_ACCEPTANCE_PENDING | Authorized Eco datastore, test accounts and proof of concurrency requirements remain open. |
| Booking history, detail, cancellation and failed refresh lock | IMPLEMENTED_AND_LOCALLY_VERIFIED | Traveler workflow specs and Chrome fixture cancellation. Tested that failed refresh cannot unlock an uncertain cancellation. |
| Payment status, server totals, pending messaging and manual refresh | IMPLEMENTED_AND_LOCALLY_VERIFIED | Traveler workflow specs and Chrome unpaid fixture. Status is an API read, independent of browser redirects. |
| Real payment status reconciliation and ledger outcomes | IMPLEMENTED_RUNTIME_ACCEPTANCE_PENDING | Needs authorized local ledger outcomes or callbacks. |
| External checkout activation and paid cancellation/refund acceptance | BLOCKED_BY_EXTERNAL_APPROVAL | Typed initiation client present, checkout disabled. Requires finance, security, approved merchant and callbacks; no external verification performed. |
| General Activities catalog/detail, taxonomy, query controls, images and aggregates, host info, unified discovery, availability and wishlist | BLOCKED_BY_BACKEND_CONTRACT | [Backend gap matrix](EXPERIENCES_BACKEND_GAPS.md) and [prioritized handoff](EXPERIENCES_BACKEND_HANDOFF.md). |
| Durable reservation idempotency and cross-session reconciliation | BLOCKED_BY_BACKEND_CONTRACT | No idempotency key at the verified revision. |
| Responsive layout, keyboard, dialog, mobile controls and color pairs | IMPLEMENTED_AND_LOCALLY_VERIFIED | Chrome exercised all fixture routes at 1440, 1200, 800, 375 and 320 px, with keyboard focus, modal trapping and restoration, and reduced motion. Main palette pairs measured at 4.76:1 or higher. This is scoped verification, not a full accessibility conformance audit. |
| Production fixture isolation | IMPLEMENTED_AND_LOCALLY_VERIFIED | Build output scanned for catalog/weather/traveler fixture markers; none found. API-mode retry had no fallback. Fixture network inspection found zero API or provider requests. |
| Supported Node 24.x regression | NOT_IMPLEMENTED | Node 24.x is absent locally. Build and tests ran on Node 26.8.1; the owner commands are in the [runbook](EXPERIENCES_LOCAL_ACCEPTANCE_RUNBOOK.md). |
| Overall local build and tests | IMPLEMENTED_AND_LOCALLY_VERIFIED | Production build passed with the existing provider style warning. 229 tests passed, 0 failed, 0 skipped across 22 files. |
