# Traveler Booking Management local acceptance runbook

From `CeylonGo-Frontend-traveler-bookings-final`, run `npm.cmd run build`, `npm.cmd test -- --watch=false`, and `git diff --check`. This checkout reuses the existing installed dependencies through a local junction because the lockfile is identical. An independent checkout can install dependencies with `npm.cmd ci`.

Start `npm.cmd start -- --host 127.0.0.1 --port 4324` and open `http://127.0.0.1:4324/my-bookings?preview=1`. Open `/my-bookings/{service}/1?preview=1` for `homestay`, `activity`, `eco`, `guide`, `rental`, and `artisan`. Search for Bentota after selecting Completed, open details, and confirm the Back link restores the list selection. On an eligible unpaid preview booking, dismiss cancellation with Escape, reopen and confirm, then verify the Cancelled count and unchanged payment state.

The local evidence directory `dist/traveler-bookings-final` contains the browser runner, screenshots and verification logs. From the checkout, `node dist/traveler-bookings-final/reference-browser.mjs` uses the installed Edge and the sibling `CeylonGo-rental-qa` Playwright dependency. It serves the production bundle on a temporary loopback port and intercepts API requests with synthetic data.

## Exact staging manifest for the feature branch

```text
angular.json
src/app/app.routes.ts
src/app/experiences/components/icon.ts
src/app/shared/components/traveler-navbar/traveler-navbar.html
src/app/shared/components/traveler-navbar/traveler-navbar.scss
src/app/shared/components/traveler-navbar/traveler-navbar.ts
src/app/traveler-bookings/booking-api.ts
src/app/traveler-bookings/booking-model.ts
src/app/traveler-bookings/booking-preview.development.ts
src/app/traveler-bookings/booking-preview.ts
src/app/traveler-bookings/booking.routes.ts
src/app/traveler-bookings/traveler-bookings.html
src/app/traveler-bookings/traveler-bookings.scss
src/app/traveler-bookings/traveler-bookings.spec.ts
src/app/traveler-bookings/traveler-bookings.ts
docs/verification/TRAVELER_BOOKINGS_ACCEPTANCE_MATRIX.md
docs/verification/TRAVELER_BOOKINGS_ACTIONS_MATRIX.md
docs/verification/TRAVELER_BOOKINGS_API_MATRIX.md
docs/verification/TRAVELER_BOOKINGS_FRONTEND_LOCAL_REPORT.md
docs/verification/TRAVELER_BOOKINGS_PHASE02_REPORT.md
docs/verification/TRAVELER_BOOKINGS_FINAL_HANDOFF.md
docs/verification/TRAVELER_BOOKINGS_FINAL_ACCEPTANCE_MATRIX.md
docs/verification/TRAVELER_BOOKINGS_EXTERNAL_ACCEPTANCE.md
docs/verification/TRAVELER_BOOKINGS_LOCAL_ACCEPTANCE_RUNBOOK.md
```
