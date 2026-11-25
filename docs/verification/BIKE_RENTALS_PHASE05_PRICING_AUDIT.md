# Bike Rentals Phase 05 Pricing and Backend Readiness Audit

Source audit on 2026-11-25 against backend feature/tr05-backend-local-complete at f795562. See the [Phase 04 integration matrix](BIKE_RENTALS_PHASE04_INTEGRATION_MATRIX.md) for routes and authentication. The cases below are synthetic and source-derived. Use only disposable fixtures for reproduction. No backend reservation, payment, migration, or external connection was executed.

## Pricing discrepancy matrix

For P1-P5 use a synthetic published bike with base daily rate LKR 1,500, an eligible synthetic traveler and an available interval. Use pickup 2099-01-01T09:00:00+05:30 and derive return from the specified elapsed duration. Paths are relative to the backend.

| Case | Source and calculation | Fixture and expected result |
| --- | --- | --- |
| P1 Base fallback | app/routers/rental_vehicles.py, calculate_rental_quote; app/routers/rental_bookings.py, create_rental_booking. Both use the base rate when no quote plan applies. | No plans, 25h. Both charge 2 days × 1,500 = 3,000. |
| P2 Hourly | Quote rounds hours to two decimals, selects hourly when that number is below 24, then bills ceiling hours with minimum 1. Booking always uses base daily rate times ceiling elapsed 24-hour days, minimum 1. | Hourly 200, duration 3h30m. Quote 800; booking 1,500. |
| P3 Daily | Quote selects active daily rate when applicable; booking ignores it and snapshots the vehicle daily rate. | Daily plan 1,200, duration two days. Quote 2,400; booking 3,000. |
| P4 Weekly/monthly | Quote checks monthly at 30 rounded-up days, then weekly at 7, then daily or fallback. Remainder uses daily plan or base. This is threshold selection, not a comparison of plan totals. | Weekly 7,000 with daily 1,200 and 8 days. Quote 8,200; booking 12,000. Monthly 26,000 with daily 1,200 and 31 days. Quote 27,200; booking 46,500. |
| P5 Duration and rounding | Same functions. Two-decimal display hours also drive quote hourly selection. Day counts use raw elapsed duration. Amounts are quantized to 0.01 using the Decimal context, with no explicit monetary mode in these functions. validate_rental_dates also returns rounded hours and ceiling days. | 23:59:59 displays 24.00h and skips hourly, but still counts as one day. At 24:00:01 both count two days even though displayed hours still round to 24.00. Repeat with equivalent UTC and offset timestamps. |
| P6 Time and repricing | Quote schema in app/schemas/rental_vehicle.py has no quote ID, issue time, expiry or hold. Creation accepts no quote ID. The 30-minute expires_at in create_rental_booking belongs only to the accepted reservation hold. | Quote one day at 1,500, change base to 1,650, then expect the independent booking calculation to use 1,650. |
| P7 Upfront fees and taxes | Quote total equals base price and creation computes only daily rate × days. No itemized taxes, traveler fees, discounts, delivery, mileage or fuel charges enter either total. app/routers/payments.py, initiate_rental_booking_payment uses stored booking total; app/routers/rental_providers.py, record_cash_payment uses its outstanding balance. Sponsorship affects ordering, and provider settlement fees are separate. | Confirm the P1 amounts and the absence of upfront line items. The absence of tax lines does not establish tax treatment. Quote currency is hard-coded LKR even though provider rate plans carry a currency field. |
| P8 Return-time charges | app/routers/rental_providers.py, record_vehicle_return uses the first active plan's mileage and floored elapsed days (minimum 1). Quote uses selected plan and ceiling days. Return reports fuel deficit and calculates a late fee using the current hourly rate after a deducted 60-minute grace period. These results are outside the upfront total. | With one plan at 100 km/day and LKR 10/km, 25h and 150 km driven, quote shows 200 km included; return logic allows 100 and reports 500 excess charge. At 90 minutes late and an active 200/h rate, late charge is 200. Without a positive active hourly rate the monetary late fee is zero. |
| P9 Cancellation | app/routers/rental_bookings.py, cancel_rental_booking. Owner only, pending/confirmed, before pickup. Lead time at least snapshot hours (null defaults to 24) is free. Otherwise use booked daily rate or half the total for a null legacy rate, capped at total and cent-quantized. Only matching verified captured online payment can reserve a refund. Existing reservations reduce it, floored at zero. | Total 3,000, rate snapshot 1,500, cutoff 24h. Exactly 24h yields zero fee; 23h yields 1,500. Matching 3,000 capture with 500 already reserved yields a pending 1,000 reserve. A pending record is not settled money. |

Ordinary plan creation rejects conflicting active duration types. Quote builds a dictionary from active plans without ordering historical duplicate rows. Price rules and historical mapping need explicit sign-off.

## Deposit discrepancy matrix

Use a synthetic bike with configured deposit LKR 2,500 and no prior deposit. Category fallbacks are bike 10,000, bicycle 3,000 and tuk-tuk 15,000, with 10,000 as the general fallback.

| Source and function | Rule and expected result |
| --- | --- |
| app/routers/rental_vehicles.py, get_rental_vehicles | Projects the nullable vehicle field. This is a listing value. |
| Same file, get_rental_vehicle and calculate_rental_quote | Configured nonnegative value (2,500), else fallback. Explicit zero stays zero. Quote excludes deposit from rental total. |
| app/routers/rental_bookings.py, create_rental_booking | Booking response and cash terms show category fallback (10,000) even when configured amount is 2,500 or zero. Cash payable rental excludes it. |
| Same file, get_rental_booking | Most recent deposit amount if present, otherwise category fallback (10,000). |
| Same file, get_booking_deposit | Required amount is category fallback regardless of actual collection. Returns held record, else latest, plus history. After collecting 2,500 it can still report 10,000 required. |
| app/routers/rental_providers.py, collect_security_deposit | Explicit positive override, else configured value when present, else fallback. Override 2,800 records 2,800; no override records 2,500. |
| Same file, resolve_security_deposit | Acts on the actual held amount. For a held 2,500 with approved deduction 500, records 2,000 refundable. This is a separate ledger from the rental-charge refund. |

## Reproduction anchors

- tests/test_rental_phase2_batch1.py has test_calculate_quote_hourly_tier, test_calculate_quote_daily_and_weekly_tier, test_calculate_quote_fallback_to_vehicle_price_per_day and test_calculate_quote_mixed_datetime_offsets.
- tests/test_rental_phase6b.py has test_ar04_vehicle_specific_security_deposit_in_quote_and_details and test_ar04_vehicle_specific_deposit_offline_collection_at_pickup. tests/test_rental_phase5_batch4.py covers deposit resolution and separation from revenue.
- tests/test_rental_phase2_batch2.py includes test_cash_reservation_returns_handover_instructions_and_deposit_notice, test_cancellation_keeps_booking_time_cutoff and test_rental_cancellation_reserves_only_remaining_verified_capture. tests/test_rental_phase6.py covers the late-return grace boundary and hourly calculation.
- These backend cases are source references. This phase exercised frontend mocks for returned price, timestamp matching, null and zero deposits, stale requests, unavailable quote and elapsed pickup.

## Frontend quote boundary

Live Details checks dates first. The returned price is a server estimate, with separate deposit disclosure, no price guarantee and no vehicle hold. A blank deposit differs from a quoted zero. Quotes for a different vehicle or interval are discarded. Equivalent UTC timestamps are accepted even when the backend serializes without an offset. A date or time edit cancels in-flight work and clears the estimate. Once the selected pickup passes, the estimate and checked availability clear. That is a client display boundary, not a quote TTL. The preview keeps sample estimates and simulated booking only.

## Local startup and port 8000

No TCP listener was observed on port 8000. GET /api/v1/health refused the loopback connection. A prior process exit reason could not be established. The repository has a template but no root .env, and the inspected shell had no explicit database target. The backend .venv has Python 3.12.10 and the core runtime packages. pyodbc lists SQL Server, Driver 17 and SQL Server Native Client RDA 11.0. Driver 18 is absent. Missing approved database settings and Driver 18 block an authorized integration run independently of the missing listener.

1. Use the backend Python 3.12 virtual environment. Check dependencies with python -m pip check and enumerate drivers with pyodbc.drivers(). Install matching ODBC Driver 18 on the approved execution host.
2. Obtain DBA approval for an isolated disposable instance, database and Windows principal. Follow TR05_SQLSERVER_PREFLIGHT_REPORT.txt and TR05_STAGING_RUNBOOK.txt to verify identity, ledger and schema. Migration writes through 046 need separate approval. Leave DB_USER and DB_PASSWORD unset for the approved Windows authentication path. The application's defaults are not a verified isolated database.
3. Set approved DB_SERVER, DB_NAME, DB_DRIVER and certificate/encryption settings in an isolated shell. The app also reads a backend-root .env if present. For authenticated checks provide a development-only JWT_SECRET_KEY through the approved secret channel. Port 4200 loopback is in the shipped CORS defaults; put the exact 4317 loopback origin in CORS_ORIGINS when using that Angular port. Use synthetic data and keep external integrations disconnected.
4. From the backend root, with the target verified, run the command below for read-only smoke checks. The normal application lifespan starts a worker that can expire bookings and write to the database. Check /api/v1/health for application liveness, then use a synthetic public inventory read to exercise database and schema access.

    .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --lifespan off

5. Exercise normal lifecycle writes, checkout and refunds only under their separate authorized staging gates. This phase did not change environment settings or launch the backend.

See backend docs/verification/TR05_EXTERNAL_ACCEPTANCE_HANDOFF.txt, TR05_FINAL_BLOCKERS.txt, TR05_PUBLIC_HUB_VISIBILITY_DECISION.txt and TR05_POLICY_DECISIONS.txt. See the [team lead decision checklist](BIKE_RENTALS_PRODUCT_DECISIONS.md) for hub visibility, eligibility evidence, and release decisions.

## Verification results

Production build passed with the existing initial bundle and provider registration stylesheet budget warnings. Full frontend regression passed 406 tests across 40 files, three more than the Phase 04 baseline. The added cases cover timestamp and deposit disclosure, stale or unavailable responses, and clearing the estimate when pickup passes. Git diff --check passed.
Edge passed all six preview booking, review, confirmation and cancellation flows with zero API requests. Edge also confirmed production excludes preview routes and assets.
