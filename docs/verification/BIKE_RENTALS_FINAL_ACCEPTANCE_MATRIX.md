# Bike Rentals Final Acceptance Matrix

Local means Edge, build, or source inspection on the audited workstation. Mocked means Angular HTTP fixtures, intercepted browser HTTP, or a synthetic client session. Policy-blocked requires approval. Live pending requires an authorized external environment.

| Area | Classification | Evidence or remaining condition |
| --- | --- | --- |
| Discovery and responsive navigation | Local | Shared navbar/footer and homepage entry, active Rentals state, and layouts at 1440/1200/800/375/320. Original image comparison remains pending. |
| Search, filters, sorting, pagination | Local and mocked | Location and date validation, filters including mobile drawer, clearing, category and sort, API query and pagination, empty/error/retry. Live public catalogue data and CORS remain pending. |
| Details and reviews | Local and mocked | All six preview Details links, image rendering, query and scroll restoration. HTTP tests cover public detail, published reviews, availability, errors and retries. |
| Wishlist | Local and mocked | Fixture wishlist persists between list and Details, guest modal opens, authenticated HTTP status/add/remove, duplicate conflict and unauthorized/forbidden states. Actual traveler sign-in and persistence require staging. |
| Quotes and deposits | Mocked and policy-blocked | Validated interval, server estimate, zero vs unspecified deposit, stale responses, unavailable/retry and expiry at pickup. Quote-to-booking price and deposit authority need approval. |
| Booking and My Rentals | Local and mocked | All six fixture flows passed dates, sample pickup/return and eligibility, price, review, simulated confirmation and cancellation. Guest confirmation prompts sign-in. Signed-in preview uses an active synthetic client session. In-memory records use owner IDs. |
| Preview opt-in | Local automated | Three regression cases cover same-route query changes for booking, My Rentals list and details. |
| Production isolation | Local build and browser | Preview assets, fixture listings and booking components absent from production output. A preview query uses the live catalog. Live request surface includes public reads, non-mutating availability validation and quote, and authenticated wishlist operations. |
| Experiences and Tour Guide | Local | No changes to their module files. Existing Experiences navigation and home Tour Guide placeholder were checked. The separate Tour Guide implementation branch was outside this scope. |
| Hubs and eligibility | Policy-blocked and live pending | No hub selector, document submission or live eligibility override. Verify approved publication, age, licences and evidence handling on staging. |
| Rental creation, payments, cancellation/refunds | Policy-blocked and live pending | No real reservation, payment or cancellation action in the UI. Authoritative totals, deposit handling, refund path and SQL Server/PayHere evidence remain open. |
| External evidence | Live pending | Loopback backend refused connection. See the [external acceptance document](BIKE_RENTALS_EXTERNAL_ACCEPTANCE.md). |
