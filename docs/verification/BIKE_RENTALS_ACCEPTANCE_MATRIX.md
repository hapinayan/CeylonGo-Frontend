# Bike Rentals Acceptance Matrix

| Requirement | Evidence |
| --- | --- |
| Premium responsive discovery and details | Implemented against the written brief. The supplied attachment contained text only, so image-to-image comparison remains open. Edge verified column counts and no page overflow at 1440, 1200, 800, 375 and 320 px. |
| Search and filters | Preview in Edge verified Enter search, category, combined city and price, mobile drawer, sorting and clearing filters. Angular HTTP tests verified combined live query parameters, invalid and incomplete dates, and stale request cancellation. Location, type and price provide one selection per group, combined across groups. |
| Pagination and errors | Edge verified live-style pagination and retry with controlled mock responses. Angular HTTP tests covered loading, empty and failure states. |
| Cards and details | Edge decoded all six fixture photos, verified each Details route and returning with prior query and scroll. Public data binding is covered with HTTP mocks. |
| Wishlist and shared UI | Edge verified preview wishlist across list and details, guest sign-in popup, homepage entry and shared Navbar/Footer. Angular HTTP tests verified traveler wishlist reads/adds/removes. Live account behavior awaits authorized test credentials. |
| Fixture isolation | Preview requires the development target and explicit opt-in. The production bundle and asset output were checked for sample listings and photos. |
| Reservations, payments and hub selection | The UI communicates unavailability. No real transactions were executed. Hub acceptance requires the open TR-05 policy decision. |

## Phase 02

| Requirement | Local evidence |
| --- | --- |
| Vehicle Details entry | Existing Details pages show the shared date checker, category, Share control and booking sidebar. Checked preview dates carry into the booking form. |
| Six-step booking and review | Edge exercised all six listings through range and maintenance validation, sample pickup and return, category-specific eligibility, estimates, review editing, terms and simulated confirmation. |
| My Rentals | Edge verified booking details, unpaid status, cancellation and reopening the cancelled record from the My Rentals list for all six listings. Unknown sample vehicles and references showed unavailable messages. |
| Authentication and preview isolation | The shared modal appeared when a guest confirmed. Authenticated cases used a local traveler fixture. The preview issued no API requests. Production excludes preview booking routes and vehicle fixtures. |
| Responsive layout | Edge checked Details, review and booking details for horizontal overflow across 1440, 1200, 800, 375 and 320 px. |

## Phase 05

| Requirement | Evidence |
| --- | --- |
| Quote and booking pricing | Source traced rate plan selection, duration and rounding, charges, base booking rate, and payment amount. Synthetic cases are in the [pricing audit](BIKE_RENTALS_PHASE05_PRICING_AUDIT.md). Quote-to-booking parity remains open. |
| Quote lifecycle and disclosure | Server estimate is labeled, with an independent quoted deposit. Date edits cancel requests, mismatched intervals are discarded, and checked pricing clears at elapsed pickup. The backend supplies no quote TTL. |
| Backend readiness and external decisions | Port 8000 refused loopback health. Startup requires an approved isolated target and ODBC Driver 18. Hub, eligibility, cancellation, refunds and release approvals remain open in the [Product/API checklist](BIKE_RENTALS_PRODUCT_DECISIONS.md). |
