# Traveler Booking Management external acceptance

## Runtime decision

Frontend booking history currently depends on the six legacy read APIs documented in the [API matrix](TRAVELER_BOOKINGS_API_MATRIX.md). Backend develop `22f8912` selects the unified Academic MVP application by default and keeps the older app available with `USE_LEGACY_RUNTIME=true`. The unified routes `/api/v1/bookings/my` and `/api/v1/bookings/{booking_id}` return a common booking with a listing ID, dates, quantity, total and lifecycle state. They do not supply the six legacy service contracts, contact and refund metadata, or an agreed mapping for historic records. Obtain a team decision on the supported runtime and data mapping before changing adapters. The incoming Artisan browsing module does not replace Artisan reservation history.

## Isolated staging evidence

- Provide an authorized endpoint, an isolated database, and synthetic accounts covering two travelers, a provider, and an administrator. Record exact frontend/backend revisions and runtime.
- Verify real login, session expiry, CORS, and owner history for every supported service. Use each synthetic traveler to check their own and the other traveler's detail URLs and confirm no foreign data appears.
- Verify refund and approved contact reads for the services listed in the [actions matrix](TRAVELER_BOOKINGS_ACTIONS_MATRIX.md). Record only redacted responses. Cover missing data and permission errors.
- Verify actual pagination metadata against representative histories. Agree the desired full-history behavior if the demo needs more than the first 20 rows from each paged service.
- Obtain the approved visual reference. Shared auth currently carries `returnUrl` to the auth entry, while inspected login navigation does not consume it. Verify the login handoff and reopen My Bookings from the traveler menu if needed.

Local preview and intercepted responses establish frontend behavior. External acceptance remains pending for live ownership, compatible service responses, privacy, and CORS.
