# Traveler Bookings Frontend Local Report

Work is isolated in the detached sibling Git worktree CeylonGo-Frontend-traveler-bookings at the published anushan commit d78afe20eb209854ceb4fe9808a0f06de0d146a3. That base passed 409 frontend tests in this worktree before changes. The original dirty feature/tour-guides-frontend worktree and anushan checkout were retained. No local branch was created or switched, and no changes were staged, committed, pushed or merged.

The selected base retains Bike Rental and Experiences. It includes the existing Tour Guides homepage/footer entry. The separate Tour Guide implementation remains on origin/feature/tour-guide-frontend and was excluded from this worktree base.

## Run locally

Use the existing Angular dependencies and start with npm.cmd start -- --host 127.0.0.1 --port 4321. Open http://127.0.0.1:4321/my-bookings?preview=1 for sample records. In supported builds /my-bookings and /my-bookings/:service/:id use actual owner-scoped history. The preview is opted into by query on the development target and sends zero booking API requests.

The shared traveler profile menu links to My Bookings. Wishlist is the existing Experiences wishlist, and notifications remain in the shared navbar. Profile/settings routes were unavailable on the selected base. The non-preview account panel uses the authenticated traveler's profile and initials.

## Visual evidence and external gates

The attachment supplied the written instructions only. The approved image comparison remains pending. Desktop/mobile captures are in ../CeylonGo-rental-qa/traveler-bookings-desktop.png and traveler-bookings-mobile.png relative to this worktree. Local preview photos reuse the development-only Experiences and rental illustrations already shipped by Angular in development. Their provenance is recorded in EXPERIENCES_PHOTOGRAPHY.md and BIKE_RENTALS_PHOTOGRAPHY.md.

The health probe to 127.0.0.1:8000/api/v1/health refused connection. Do not substitute a production connection. Use authorized staging traveler accounts and isolated infrastructure for live auth, history, ownership, sensitive metadata and CORS checks. The project has no unified booking endpoint. See the [API matrix](TRAVELER_BOOKINGS_API_MATRIX.md) and [acceptance matrix](TRAVELER_BOOKINGS_ACCEPTANCE_MATRIX.md) for scope.

## Verification

- npm.cmd run build passed with the existing initial-bundle and provider-registration stylesheet budget warnings.
- npm.cmd test -- --watch=false passed 415 tests across 41 files. Six new cases cover adapters and collision-safe keys, status/search/counts, partial HTTP failure/retry, scoped details, guard boundaries and session changes.
- Edge verified all six preview detail routes, 1440/1200/800/375/320 px, combined search/status and returning from Details with filters and scroll restored. Preview issued no booking API calls.
- Production Edge checks redirected guest preview dashboard and detail URLs to the homepage. Bundle scan found no sample titles, and the rental fixture asset URL returned 404.
- git diff --check passed. Changes remain unstaged.

## Synchronization with develop

The isolated integration worktree CeylonGo-Frontend-traveler-bookings-integration is detached at origin/develop commit 6214656d8bd9b2e4fbb50d424711ad9ef180a33a. This section records a separate verification run from the original 415-test worktree above. Dependencies were installed with npm ci from the existing lockfile. The three tracked edits, nine booking implementation/test files and three reports were transferred explicitly, with the routing edit reapplied before the upstream wildcard. All 15 files in the original booking worktree were verified against their pre-integration SHA-256 hashes.

| Test run | Build | Full suite |
| --- | --- | --- |
| Earlier booking worktree at d78afe2 | Passed | 415 passed, 0 failed |
| Clean fetched develop at 6214656 | Passed with existing budget warnings | 508 passed, 2 failed |
| Integrated bookings at 6214656 | Passed with the same budget warning categories | 514 passed, 2 failed |

Both failures were reproduced on clean develop. app.routes.spec.ts expects the root to redirect to /homestays, but the incoming route loads TravelerHome at /. The Experiences discover spec expects unknown routes to redirect to /auth, but the incoming wildcard redirects to /homestays. The MVP requirements do not specify these redirect targets. Neither route behavior nor the upstream tests were changed. All six transferred booking tests passed and Git diff --check passed.

The Homestay review is a pre-booking/demo component. The Tour Guide page and client cover discovery. Neither replaces owner-scoped booking history or details. The six read contracts were rechecked against local backend f795562 and required no adapter changes. Existing Artisan handling remains available through the verified reservations adapter, with no separate top-level Artisan route on this base.

Edge verified all six preview and mocked authenticated detail routes, combined search and filters, isolated retry after partial failure, the pagination scope notice, scroll restoration, Homestay/Tour Guide aliases, Experiences and Bike Rental navigation, guest access denial, and layouts at 1440/1200/800/375/320 px. The production build excluded the Traveler Bookings fixtures. The local API still refused the connection, so live ownership and service integration remain pending. No real booking or financial actions were enabled by this integration.

The clean and integrated build/test logs and browser runner are in the sibling CeylonGo-rental-qa folder with filename prefix booking-sync-. The integration remains unstaged. Neither original worktree nor the published branch was changed.
