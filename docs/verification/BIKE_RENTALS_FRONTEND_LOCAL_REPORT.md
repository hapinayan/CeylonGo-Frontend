# Bike Rentals Local Verification

- Frontend branch `feature/tour-guides-frontend`. Angular 21, Node 24.
- Development preview at `http://127.0.0.1:4317/bicycles?preview=1` while the server is running. Live mode is `/bicycles`.
- Screenshots are outside the repository in `../CeylonGo-rental-qa/` relative to the repository root. Files are `bike-rentals-desktop.png` and `bike-rentals-mobile.png`.
- `npm.cmd run build` passed. Angular warned about the initial bundle and provider registration stylesheet budgets.
- `npm.cmd test -- --watch=false` passed all 398 tests across 40 files. The current frontend had 391 passing tests before this feature. The older standalone 231-test commit was not run separately.
- `git diff --check` passed. Backend source was reviewed without editing the backend.
- Edge exercised development fixtures and controlled API mocks. The local backend endpoint did not accept connections, so live end-to-end API verification remains pending.
- The active branch has direct Traveler Navbar links and no Explore dropdown. Rental links use the existing Traveler Homepage discovery card and Footer Explore section. The textual reference provided the layout because the separate UI image was unavailable.

## Phase 02 recovery (2026-11-25)

- Recovered the prior implementation instructions and reused the saved booking stepper, review, confirmation, date picker, route definitions and My Rentals interfaces. Integrated the date picker and preview booking link into the shared Vehicle Details template.
- Development routes (serve locally with `npm.cmd start -- --host 127.0.0.1 --port 4317`):
  - Discovery and Details at `/bicycles?preview=1` and `/bicycles/1?preview=1` through `/bicycles/6?preview=1`.
  - Booking at `/bicycles/1/booking?preview=1` through `/bicycles/6/booking?preview=1`.
  - My Rentals at `/bicycles/my-rentals?preview=1` and details at `/bicycles/my-rentals/:reference?preview=1`.
- Edge exercised Honda Dio Scooter (1440 px), Yamaha FZ Motorcycle (1200 px), Trek Mountain Bicycle (800 px), TVS Jupiter Scooter (375 px), Bajaj Pulsar Motorcycle (320 px) and Hero Electric Cycle (1440 px). Each completed a two-day estimate, review, simulated confirmation, booking details, cancellation and My Rentals navigation.
- Browser evidence is in `../CeylonGo-rental-qa/phase02-booking-review-desktop.png` and `../CeylonGo-rental-qa/phase02-booking-review-mobile.png` relative to the repository root. Authenticated browser runs used a local test traveler fixture. A separate guest run verified the shared sign-in prompt.
- The production build passed with the existing initial-bundle and provider registration stylesheet warnings. Regression tests passed with 398 passing, 0 failed across 40 files. `git diff --check` passed.
- Samples live in memory until the app reloads. Live integration and external acceptance gates remain open as recorded in the backend gaps and acceptance matrix.
