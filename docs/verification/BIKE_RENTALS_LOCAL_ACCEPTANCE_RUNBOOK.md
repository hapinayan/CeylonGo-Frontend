# Bike Rentals Local Acceptance Runbook

Use Node 24, the frontend package lock and the repository Angular CLI. The commands below run in PowerShell from the frontend root. Review existing uncommitted files and keep the current index intact.

```powershell
git status --short --branch
npm.cmd run build
npm.cmd test -- --watch=false
git diff --check
npm.cmd start -- --host 127.0.0.1 --port 4317
```

## Browser replay

1. Open http://127.0.0.1:4317/bicycles?preview=1. Check 1440, 1200, 800, 375 and 320 px for horizontal overflow, reachable controls, active Rentals navigation and 3/3/2/1/1 card columns. Follow the traveler homepage rental card and footer entry. Verify date-range errors, location search, category, price, rating and sorting, clearing filters, and the mobile filter drawer.
2. Open all six Details links (fixture IDs 1–6). Check images and location, save a fixture, return with query and scroll preserved, and reopen Details. Preview ratings/photos and estimates should be labeled samples.
3. For each sample, navigate to /bicycles/:id/booking?preview=1. Try a reversed range and maintenance overlap, then use a valid interval. Verify pickup/return acknowledgment, bicycle and motorbike eligibility scenarios, safety and terms, daily-rate sample estimate and editable review. As a guest, confirm that completing the review opens the shared sign-in popup and creates no record.
4. Repeat the eligible path in the existing browser QA fixture for an active synthetic traveler. Confirm the simulation and inspect /bicycles/my-rentals/:reference?preview=1, then cancel and reopen from /bicycles/my-rentals?preview=1. Check unknown sample IDs/references, and remove or replace preview=1 on a same-route Angular navigation to verify redirect. No reservation, payment or hub request should occur. Preview records are in memory and clear on reload.
5. Use the suite's HttpTestingController and controlled Edge mocks for live catalog and details. Check empty/loading/error and retry, paging, masked guest auth behavior, published reviews, server availability and quote, separate deposit, quote expiry at pickup and invalidation, and authenticated wishlist success/conflict/401/403. The live backend is not needed for these mocks.
6. Serve dist/ceylongo/browser with SPA fallback on loopback and intercept public listing requests with safe synthetic fixtures. Visit /bicycles?preview=1 and each preview booking URL. Expect the live catalog only and no booking or My Rentals UI. Confirm /assets/rental-preview/blue-scooter.webp returns 404 and search built JS/assets for fixture names and simulation copy. Do not run a real booking test.
7. Smoke-test the Experiences entry and the Tour Guides controls already present on HEAD. The Tour Guides landing card is a placeholder on this baseline. The separate Tour Guide implementation branch is out of scope.

## Existing local browser evidence

From the frontend root, this workstation keeps optional Edge runners in ../CeylonGo-rental-qa/ with a local playwright-core dependency. The runbook above can be replayed without that folder.

```powershell
node ../CeylonGo-rental-qa/verify-refinement.mjs
node ../CeylonGo-rental-qa/phase02.mjs
node ../CeylonGo-rental-qa/production.mjs
```

Screenshots in the same folder are bike-rentals-refined-desktop.png, bike-rentals-refined-mobile.png, phase02-booking-review-desktop.png and phase02-booking-review-mobile.png. They are local QA evidence and excluded from the staging proposal. The written design brief was available; the approved reference image was unavailable.

## Connectivity

A safe loopback health probe is curl.exe --noproxy '*' --max-time 4 http://127.0.0.1:8000/api/v1/health. Phase 06 received connection refusal. Follow the [pricing audit](BIKE_RENTALS_PHASE05_PRICING_AUDIT.md) for startup prerequisites and [external acceptance](BIKE_RENTALS_EXTERNAL_ACCEPTANCE.md) for approved database and sandbox execution. The build and browser mocks do not require a backend startup.
