# Traveler Bookings API Matrix

Source audited against the local CeylonGo backend. Endpoint paths below are relative to /api/v1. All requests are GET and use the existing traveler session interceptor. The unified UI has no mutation client.

| Service | Traveler history | Detail | Coverage and limits |
| --- | --- | --- | --- |
| Homestay | /bookings/me | /bookings/{id} | booking.py. Owner history and owner or admin detail. UI sends only an active traveler session. Check-in, check-out, guests, server total, payment and booking states, name when supplied, and booked nightly-rate snapshot when present. |
| Activity | /activity-bookings/me | Resolve matching ID from the same owner-scoped traveler list | activity_bookings.py. No mounted traveler activity detail endpoint. The list lacks activity title, schedule time and location. The UI shows the supplied slot ID and does not infer booking dates or upcoming status. |
| Eco-Tourism and bookable Experiences | /eco-reservations/me with page and page_size | /eco-reservations/{id} | eco_reservations.py. Reuses TravelApi. Traveler role and ownership enforced. Native eco reservations include slot dates, participant count, reference and total, but no experience title or thumbnail. Legacy eco_bookings.py history is not mounted by app/main.py. |
| Tour Guide | /tour-guide-bookings/me with page and page_size | /tour-guide-bookings/{id} | tour_guide_bookings.py. Default all bucket. Uses backend package/guide name, dates, people, location and status. The dashboard uses the traveler route only. |
| Bike & Bicycle Rental | /rental-bookings/me with page and limit | /rental-bookings/{id} | rental_bookings.py. Default all bucket and owner-scoped records. History supplies listing name, image and pickup label when available; detail can fall back to the vehicle ID. Actual reservation amount and payment state are displayed independently. Development Rental My Rentals stays separate. |
| Artisan | /artisan-reservations/me | /artisan-reservations/{id} | artisan_reservations.py. Traveler history with owner access. This is the verified showcase-item reservation contract. No separate Artisan workshop/experience booking history was found. |

The keys are service plus original numeric ID. The UI keeps canonical references where provided. Completed and cancelled use explicit lifecycle states. Upcoming uses a future supplied service date with an eligible pending, confirmed, approved or ready-for-pickup state. Passed dates alone do not make a record completed. Expired, rejected, in-progress and unclassified records remain visible in All. The payment status is independent.

Eco, tour guide and rental display up to the first 20 records per service. Scope is disclosed when the server counts or a full Eco page indicate that additional records may exist. Counts and search apply to loaded records, including after a partial outage. Failed sources have a separate retry. Requirements for historical pagination beyond this window and richer activity/eco metadata remain open.

The portal makes no cancellation, payment, or receipt request. The Phase 02 [actions matrix](TRAVELER_BOOKINGS_ACTIONS_MATRIX.md) records the supported read-only refund and contact requests. The six history adapters target the legacy runtime. See [External acceptance](TRAVELER_BOOKINGS_EXTERNAL_ACCEPTANCE.md) for the new default unified runtime and deployment decision. The loopback API refused connection; contract details were verified from source and integration behavior was exercised with fixtures/mocks.
