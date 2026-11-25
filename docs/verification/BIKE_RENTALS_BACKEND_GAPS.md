# Bike and Bicycle Rentals API

Source reviewed in the backend branch `feature/tr05-backend-local-complete`, including `app/routers/rental_vehicles.py`, `rental_wishlists.py`, `rental_reviews.py`, `rental_locations.py`, `rental_eligibility.py`, `app/schemas/rental_vehicle.py`, `app/services/rental_availability.py`, TR-05 visibility notes, and rental test fixtures. Frontend tests mock responses from confirmed contracts. The live API was unreachable at the configured loopback address during verification.

| Contract | Frontend behavior |
| --- | --- |
| `GET /api/v1/rental-vehicles` | Sends `vehicle_type`, optional `city`, price bounds, paired `pickup_at` and `return_at`, `sort_by`, `page` and `limit`. Search dates represent midnight in Sri Lanka. One type uses API pagination. All Vehicles merges sorted prefixes from the bike and bicycle streams and uses their combined totals. Sponsored inventory retains precedence. |
| `GET /api/v1/rental-vehicles/categories` | Confirms `bike`, `bicycle` and `tuk_tuk`. The UI uses the first two in the live catalog. Scooters and motorcycles share one backend type. Electric bikes have no separate type. Category fleet counts do not represent filtered search counts and are omitted. |
| `GET /api/v1/rental-vehicles/{id}` | Sends an anonymous request so staff and provider preview privileges do not leak into traveler discovery. Displays public listing fields, gallery, business name, assigned public location label and supplied vehicle terms. A third vehicle type is rejected by the bike and bicycle detail view. |
| `GET /api/v1/rental-vehicles/{id}/availability` | Checks the selected interval using `start_date` and `end_date` after public detail succeeds. Uses the availability flag and discards schedule periods. Availability may change. |
| `GET /api/v1/rental-vehicles/{id}/reviews` | Shows the aggregate rating and up to five published reviews after public detail succeeds. Browse responses have no aggregate rating or count. |
| `GET /api/v1/rental-wishlist/{id}/status`, `POST /api/v1/rental-wishlist/{id}`, `DELETE /api/v1/rental-wishlist/{id}` | Uses the existing traveler session and interceptor. Guests see the shared sign-in popup. Preview hearts use session-local Angular state without an HTTP request. |
| `GET /api/v1/rental-locations` and `GET /api/v1/rental-vehicles/{id}/locations` | These routes exist. TR-05 still records the different visibility predicate for the vehicle-specific hub association as awaiting approval. The client omits hub selectors and does not fetch from either directory. |

## External acceptance

- Confirm the public vehicle hub policy with Product and the API owner. Verify pickup and return visibility with published, withdrawn, inactive and foreign-hub records on authorized staging.
- Verify catalog data, CORS, public detail visibility, availability, published reviews and wishlist persistence with a running backend and test traveler account.
- Live search offers newest and price sorting. Popularity, rating filters, rating sorting and vehicle subtypes require an expanded discovery contract. A stable server-side tie-breaker and a multi-type query would simplify mixed pagination.
- Quote, personalized eligibility, booking and payment endpoints were outside local acceptance. The client sends no reservation or payment requests. Exact provider-specific age and license requirements need confirmation before any rental.

## Phase 02 source review

Reviewed the local `app/routers/rental_bookings.py`, `app/schemas/rental_booking.py` and `app/services/rental_eligibility.py`.

| Contract | Phase 02 behavior |
| --- | --- |
| `POST /api/v1/rental-bookings/validate-dates` | The live Details date checker sends the vehicle ID and offset timestamps anonymously. The backend pre-validates the interval, reports collisions and rounds billable days up in 24-hour increments. The preview uses a sample maintenance day and sends no request. |
| Booking creation and eligibility | The backend checks authenticated traveler eligibility, computes the total from the vehicle's daily rate and duration, and creates a time-limited hold when a real booking is accepted. Backend default age settings are 18 for bikes and 16 for bicycles. Configured rules can differ, and the default bicycle path does not require trusted date-of-birth evidence. The preview demonstrates age and licence scenarios with a sample profile. |
| Booking history, details and cancellation | The backend exposes `GET /rental-bookings/me`, `GET /rental-bookings/{booking_id}` and owner-scoped `PATCH /rental-bookings/{booking_id}/cancel` under `/api/v1`. Cancellation requires a pending or confirmed booking before pickup. The preview stores only pending or cancelled samples in memory and scopes them to the active traveler. |
| Payment and handover | The booking response includes status and payment status, with unpaid on creation. Provider handover and return have their own operations. The preview displays unpaid and pickup/return information without executing these operations. |

Live booking, payment, pricing and deposit acceptance, eligibility verification with staging data, and public hub visibility remain open. The preview performs no booking, payment, hub, or document requests.
