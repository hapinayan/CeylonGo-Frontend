# Bike Rentals Product and API Decisions

Decision checklist for the team lead. The [pricing audit](BIKE_RENTALS_PHASE05_PRICING_AUDIT.md) contains code sources and synthetic cases. All items are open.

| Owner | Decision and acceptance evidence |
| --- | --- |
| Product, Finance, API | Approve a single rule for hourly/daily/weekly/monthly/base pricing, plan precedence, rounding, currency, discounts, taxes and fees. Decide if a server quote is informational or bookable. If bookable, define quote ID, expiry, repricing and invalidation, and verify quote, booking, cash and payment amounts against the same fixture. |
| Product, Finance, API | Choose the authoritative deposit amount and when it becomes immutable. Specify precedence for category defaults, configured amounts, explicit zero and provider overrides. Align quote, booking, cash terms, deposit read and collection, then reconcile required, held, deducted and released amounts. |
| Product, API (T-06) | Approve public hub directory scope and vehicle association visibility. Vehicle-specific lookup currently returns active owned hubs for an approved vehicle even if public detail rejects publication. General directory checks active state. Creation checks supplied active, provider-owned hubs. Decide whether both reads must follow publication and align legacy versus map-edit review behavior. Test hidden/withdrawn vehicles, inactive and foreign hubs, and empty published results. |
| Compliance, Product, API (X-01/X-02/X-11) | Approve traveller-readable effective age and licence rules, trusted date-of-birth sources, document types, ownership/access, expiry through return and foreign permit combinations. Eligibility read returns masked account flags; booking independently checks approved evidence and effective age. Approve handover rechecks and synthetic staging cases without collecting documents in preview. |
| Product, Finance, Payments (T-14) | Approve published cancellation cutoff, snapshot semantics, legacy fallback fee, rounding and cash/unpaid/online treatment. Define execution ownership for pending refund reserves and receipts, and verify a reservation separately from a completed refund. |
| Product, Operations, Finance (X-06/X-07) | Sign off on allowed mileage day counting, mileage plan selection, fuel terms, late grace and booked versus current rates, plus inspection evidence and retention. Agree how any post-return charge is communicated and reconciled. |
| Product, Operations, Compliance | Keep existing catalogue and legacy mapping (T-03), business evidence and verification (A-04), seating (X-10) and reminder timing (T-18) decisions open. |
| DBA, Payments, QA | Authorize isolated SQL Server preflight and separate migration/concurrency/ledger runs, PayHere sandbox callback and refund evidence, approved storage access and authenticated Angular/Flutter staging. No external gate closes on frontend mock evidence alone. |

Until approved, the frontend displays a server estimate with its quoted deposit separately. Hub selection, real reservations and payments remain disabled.
