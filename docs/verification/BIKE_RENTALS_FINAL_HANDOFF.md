# Bike Rentals Final Handoff

Phase 06 closes the locally verifiable Bike & Bicycle Rental frontend scope on feature/tour-guides-frontend. Live discovery and Details use the audited public APIs when available. Wishlist uses the existing session; live prices are estimates. Booking, review, confirmation and My Rentals remain development simulations. Live eligibility, hub selection, reservation creation and payments remain gated.

## Evidence and deliverables

- Phase 01 discovery evidence and Phase 02 recovery are in the [local report](BIKE_RENTALS_FRONTEND_LOCAL_REPORT.md) and [prior acceptance matrix](BIKE_RENTALS_ACCEPTANCE_MATRIX.md). Phase 03 refinement evidence is the desktop/mobile capture pair named in the [local runbook](BIKE_RENTALS_LOCAL_ACCEPTANCE_RUNBOOK.md). The written brief was available; the approved reference image comparison is pending.
- Phase 04 contracts are in the [integration matrix](BIKE_RENTALS_PHASE04_INTEGRATION_MATRIX.md). Phase 05 price and deposit discrepancies are in the [pricing audit](BIKE_RENTALS_PHASE05_PRICING_AUDIT.md), with the [decision checklist](BIKE_RENTALS_PRODUCT_DECISIONS.md).
- Phase 06 adds this handoff, the [final matrix](BIKE_RENTALS_FINAL_ACCEPTANCE_MATRIX.md), the [external acceptance requirements](BIKE_RENTALS_EXTERNAL_ACCEPTANCE.md) and the [local runbook](BIKE_RENTALS_LOCAL_ACCEPTANCE_RUNBOOK.md). The only source fix is in rental-booking-routes.development.ts, with three regression cases in rental-discover.spec.ts. Preview guards now rerun after a query-only navigation so removing opt-in leaves the preview route.
- The external gates remain open. The loopback backend refused the health connection. This handoff does not establish production readiness.

## Final local verification

- Production build passed with existing initial bundle and provider registration stylesheet budget warnings. Full regression passed 409 tests in 40 files, including the three new query-change cases. Git diff --check passed.
- Edge passed all six preview workflows, the responsive discovery checks, guest authentication prompts, controlled mock paging/retry, Experiences navigation and the existing Tour Guide entry. Authenticated previews used a local synthetic client session and made no API requests. The production build excludes preview routes and fixtures.

## Audited Git scope and proposed staging manifest

HEAD and the local origin/develop tracking ref both resolve to f61ea9819b76ae9aa5d51d5b301fbf41f36df4fa at this audit. The index is empty. All seven tracked diffs were inspected individually. Their additions/replacement are rental-specific; the existing Experiences asset replacement next to the Angular changes is retained.

| Tracked path | Rental change |
| --- | --- |
| angular.json | Development-only images and replacements for catalog/booking routes |
| src/app/app.routes.ts | Lazy /bicycles route before fallback |
| src/app/pages/traveler-home/traveler-home.ts | Routes the bicycles card; other cards retain existing handler |
| src/app/shared/components/footer/footer.html | Bike Rentals link points to /bicycles |
| src/app/shared/components/traveler-navbar/traveler-navbar.html | Rental-scoped desktop and mobile link and active state |
| src/app/shared/components/traveler-navbar/traveler-navbar.scss | Rental-scoped navbar width, gap and responsive breakpoint |
| src/app/shared/components/traveler-navbar/traveler-navbar.ts | Recognizes the bicycles route and descendants |

Proposed untracked additions after scope review:

- Exactly these 27 files under src/app/bike-rentals/: _rental-ui.scss, rental-api.ts, rental-booking-management.html, rental-booking-management.ts, rental-booking-preview.store.ts, rental-booking-routes.development.ts, rental-booking-routes.ts, rental-booking.html, rental-booking.scss, rental-booking.ts, rental-date-picker.html, rental-date-picker.scss, rental-date-picker.ts, rental-dates.ts, rental-details.html, rental-details.scss, rental-details.ts, rental-discover.html, rental-discover.scss, rental-discover.spec.ts, rental-discover.ts, rental-image.ts, rental-models.ts, rental-preview.development.ts, rental-preview.ts, rental-wishlist.ts, rental.routes.ts.
- Exactly public/images/bike-rentals/coastal-road.webp.
- Exactly six files under src/development-assets/rental-preview/: black-motorcycle.webp, blue-scooter.webp, electric-bicycle.webp, mountain-bicycle.webp, red-scooter.webp and white-motorcycle.webp.
- Exactly these 11 files under docs/verification/: BIKE_RENTALS_ACCEPTANCE_MATRIX.md, BIKE_RENTALS_BACKEND_GAPS.md, BIKE_RENTALS_FRONTEND_LOCAL_REPORT.md, BIKE_RENTALS_PHASE04_INTEGRATION_MATRIX.md, BIKE_RENTALS_PHASE05_PRICING_AUDIT.md, BIKE_RENTALS_PHOTOGRAPHY.md, BIKE_RENTALS_PRODUCT_DECISIONS.md, BIKE_RENTALS_FINAL_HANDOFF.md, BIKE_RENTALS_FINAL_ACCEPTANCE_MATRIX.md, BIKE_RENTALS_EXTERNAL_ACCEPTANCE.md and BIKE_RENTALS_LOCAL_ACCEPTANCE_RUNBOOK.md.

This is a proposal for 7 tracked modifications and 45 new files. Review an explicit path list again immediately before staging. Exclude sibling QA scripts and screenshots, generated build output, backend files, environments/credentials and unrelated work.

## Recommended branch separation after authorization

Separation is viable. The audited work is in the unstaged frontend tree and its base matches the local origin/develop ref. The separate Tour Guide implementation dcb4219 is reachable from origin/feature/tour-guide-frontend (singular) and is outside this HEAD's history. The current baseline has the existing Tour Guide home/footer controls and the home placeholder. No Tour Guide implementation should be moved or merged for this rental extraction.

1. Keep the present working tree and index in place. Verify the intended base revision and record the tracked and untracked manifest again.
2. In a separate worktree created from the confirmed base, transfer only the seven reviewed hunks using a patch exported from HEAD and round-trip check it before applying. Copy the 45 named additions explicitly, preserving paths and binary assets. An ordinary git diff omits untracked files.
3. Compare the tracked patch, file inventory and asset hashes with this tree. If using a newer base, resolve only reviewed rental hunks and retain any unrelated changes already on that base. Rerun the build, regression suite and browser checks there. Have the owner review the staged path list before any later commit or push.
4. Keep the original tree until the transferred files and acceptance results are verified. This phase did not create a worktree or branch, switch branches, or touch the index.
