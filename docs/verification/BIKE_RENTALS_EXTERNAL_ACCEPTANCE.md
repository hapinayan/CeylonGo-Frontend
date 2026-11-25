# Bike Rentals External Acceptance

Status: open. Phase 06 used local builds, fixtures, HTTP mocks and backend source evidence. The loopback backend was unavailable. These gates require a separately authorized environment and operator. See the [pricing and startup audit](BIKE_RENTALS_PHASE05_PRICING_AUDIT.md) and [Product/API decisions](BIKE_RENTALS_PRODUCT_DECISIONS.md).

## Policy approvals

| Owner | Required decision |
| --- | --- |
| Product, Finance, API | Reconcile rate-plan quotes with base-rate bookings. Approve duration rules, rounding, currency, fees and taxes, price validity, and whether quotes are bookable. Set one approved deposit source and snapshot, including configured zero, category defaults, overrides, collection and settlement. |
| Product, API | Approve public hub visibility and vehicle association rules, including unpublished vehicles, inactive/foreign default hubs and review of pickup changes. Confirm T-03 category IDs and mappings. |
| Compliance, Operations, API | Approve effective age, trusted DOB, licence classes, validity through return, permits, evidence access and retention. Confirm handover checks, insurance visibility, seating and business approval rules. |
| Product, Finance, Payments | Approve cancellation snapshot and legacy rules, cutoff and fee rounding, unpaid/cash/online treatment, and who executes and reconciles refunds. Define return charges, evidence, reminders and snapshot rules. |

## Isolated SQL Server

Follow backend docs/verification/TR05_STAGING_RUNBOOK.txt, TR05_SQLSERVER_PREFLIGHT_REPORT.txt and TR05_FINAL_BLOCKERS.txt. The guarded target in that runbook is localhost\SQLEXPRESS and CeylonGoDB_IntegrationTest. Ask the DBA to authorize the execution host, Windows principal, server/machine/instance identity and disposable database. Verify the connected identity against the runbook allowlist before any migration or test. Use Python 3.12.10, the backend dependencies and ODBC Driver 18. Leave DB_USER and DB_PASSWORD unset for Windows authentication. The current host lacked Driver 18 and explicit isolated DB settings in Phase 05.

1. Obtain read-only preflight approval. Compare the complete ledger through 042 and any applied suffix to filenames and checksums. Check catalog state and stop on mismatches, untracked destination objects or an unapproved target.
2. Obtain separate write approval and a verified backup or checkpoint. Review the guarded plan through 046. Apply only the approved pending suffix, then validate 043–046 ledger checksums, auth-version, party/agreement, helmet and insurance columns, enabled constraints and the unique rental age key. Verify historical rows were preserved.
3. Run all 11 cases in tests/test_rental_sqlserver_staging.py on the approved target with the guarded opt-in and a fresh test directory. Archive the JUnit report, environment identity and migration ledger. An offline collection or SQLite result does not satisfy this gate.
4. Use independent connections plus a third reader to verify overlap/adjacency, booking versus both blackout writers, elapsed holds and provider acceptance versus expiry/capture. Verify deletion versus booking references and exact ownership. Check capture/cancellation in both orders, callback replay, cash same-key replay and different-amount conflict, no over-collection, concurrent refund decisions, and atomic ledger/audit/notifications on rollback.
5. Verify migrated eligibility, publication, protected evidence access, signed pickup/return acknowledgement, cash/online receipts and deposit/refund/payout reconciliation. Confirm document storage and access with approved synthetic fixtures. Release requires authorized client evidence as well as DB evidence.

## PayHere sandbox

Follow backend docs/verification/TR05_PAYHERE_SANDBOX_CHECKLIST.txt. Require an approved sandbox merchant, its signing secret through the approved secret store, a reachable approved HTTPS callback, approved return/cancel URLs, disposable persistence, and synthetic traveler, provider and finance roles. Use sandbox mode. Determine payment state from server records after the signed callback.

| Case | Required evidence |
| --- | --- |
| PH-01 checkout | Eligible owner gets stable server order, exact amount/currency and one pending transaction on retry. Foreign traveler, cash, zero-total, expired and terminal cases create no new transaction. |
| PH-02 capture/replay | Signed notify captures once with matching booking/reference and recipient alerts. Replay adds no effects. Malformed or mismatched merchant/signature/amount/currency and conflicting capture identity produce no new ledger rows. |
| PH-03 late capture | Cancelled and expired bookings remain terminal, each with one pending refund for its verified late capture. Replay adds no reserve. |
| PH-04 sponsorship | Approved owner checkout and capture are idempotent. Finance activation follows verified capture. Confirm campaign window and provider/listing scope and absence of new rental booking payment rows. |
| PH-05 refunds and reconciliation | Reconcile verified amount/currency, pending reserves, cash, deposits and payouts across authorized views. Record verified sandbox execution or separately authorized manual settlement. Review approval alone leaves execution open. |

Archive role, revision, case, UTC timestamp, expected/observed status, redacted identifiers, response and before/after ledger counts. Keep credentials, hashes, raw callbacks, card data and personal records out of shared evidence. Record unavailable sandbox operations as unexecuted.

## Client and visual sign-off

Use authorized staging accounts and deployed Angular/Flutter clients to replay TR05_CLIENT_CONTRACT_FIXTURES.json. Cover public visibility, authenticated owner/foreign-owner outcomes, quote/booking/deposit parity under approved rules, cancellation and payment status, approved hub and map data, eligibility/inspection boundaries, alerts and receipts. The current Angular build keeps real reservations and payments disabled. Obtain the approved reference image and compare desktop and mobile captures before visual sign-off.
