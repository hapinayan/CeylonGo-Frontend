# Experiences external acceptance

Status: all external gates remain open. Local acceptance used Angular HTTP mocks and route-scoped development fixtures. This document grants no runtime or account authorization.

| Gate | Evidence required | Owner |
|---|---|---|
| Isolated runtime | Record the exact backend revision, vetted local database configuration, seeded test listings and travelers, approved environment variables, and browser origins. Confirm database safety guards. Obtain explicit authorization for writes against the isolated data store. | Backend and database owners |
| Supported frontend runtime | Run npm.cmd run build and npm.cmd test -- --watch=false on an Angular 21-supported Node 24.x runtime. Record versions, warnings and results. | Frontend owner |
| Eco catalog and details | Verify published and hidden records, category and range filters, counts, pagination, numeric identifiers, pricing units, gallery and missing fields against seeded public data. | Catalog API owner |
| Traveler sign-in and ownership | Use two isolated traveler accounts and a provider account. Verify auth, expired session handling, logout and switching, owner-only wishlist and booking reads, and provider rejection. | Authentication owner |
| Wishlist persistence | Verify save, remove, duplicate add, missing remove, available-only pagination and provider suspension. Confirm source-of-truth reconciliation across tabs and logout. | Wishlist API owner |
| Availability and reservations | Verify Lanka date boundaries, minimum and maximum party sizes, age and safety rules, capacity and per-group exclusivity, parallel submissions, slot conflicts and authoritative totals. Define the support/reconciliation process for timeouts because there is no client idempotency key. | Reservation and product owners |
| Cancellation | Verify ownership, start-time handling, pending and confirmed transitions, snapshot cancellation windows, released capacity and uncertain-result reconciliation. Treat paid cancellation and refunds as a distinct approval gate. | Reservation and finance owners |
| Payment status and reconciliation | Exercise unpaid, pending, expired, failed, paid and refund cases through authoritative server status. Verify webhook signature checks, callback amount/currency checks, duplicate delivery, late capture and refund states. Browser returns alone provide no payment confirmation. | Payments and finance owners |
| PayHere sandbox | Require approved test merchant and environment, safe callback URLs, finance approval, explicit frontend activation, backend-native payment activation and isolated test reservations. Verify allowlisted checkout destinations and backend-signed fields. Keep external checkout disabled until approval. | Payments, security and product owners |
| Weather upstream stub | Use a controlled backend upstream stub and authorized local runtime. Exercise current and forecast contracts, location ambiguity, missing configuration, stale cache, throttling, timeout and cross-origin Retry-After. Weather providers remain outside current verification. | Weather API and platform owners |
| General Activities | Approve the public API contracts and acceptance tests in [the backend gap matrix](EXPERIENCES_BACKEND_GAPS.md). | Catalog API and product owners |



## Final frontend pass

No external gate was closed during the final pass. The source SQLite reference launcher has Artisan seed data and requires adaptation in an owner-approved disposable runtime for Eco acceptance. Follow the [local acceptance runbook](EXPERIENCES_LOCAL_ACCEPTANCE_RUNBOOK.md) for exact environment names, isolation gates, test seeds, startup commands, stub behavior and cleanup. Payment UI remains disabled pending sandbox approval and frontend activation. Node 24.x verification remains pending.
