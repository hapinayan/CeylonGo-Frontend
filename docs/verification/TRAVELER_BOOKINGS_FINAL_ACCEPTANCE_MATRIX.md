# Traveler Booking Management final acceptance matrix

| Area | Local evidence | Remaining acceptance |
| --- | --- | --- |
| My Bookings | Synthetic data and mocked responses cover combined search/status, counts, duplicate service IDs, per-service failure/retry and back-navigation restoration. | Counts and search apply to loaded rows. Eco, Guide and Rental load their first 20 records per service and disclose additional pages when detected. Any broader history requirement needs a pagination design. |
| Booking Details | Homestay, Activity, Eco, Guide, Rental and Artisan each exercised through dev preview and mocked authenticated routes. Activity resolves the ID from owner history. | Verify real records for all six on the approved runtime. |
| Payment and refund history | Booking state and payment state are independent. Mocked Eco and Tour Guide refund reads verify the displayed ledger state. | Confirm owner scoping and available refund data in staging. |
| Provider contact | Mocked Homestay and Tour Guide contact reads run only after detail success; automated checks cover denial and session changes. | Confirm approved business-only contact values and publication predicates in staging. |
| Access and privacy | Tests cover guest/provider denial, a 403 response, and clearing pending/previous data on session change. Browser evidence covers auth redirect and zero guest booking requests. | Verify actual JWT login, owner versus foreign owner, expiry and role behavior. |
| Cancellation and fixtures | Keyboard dismissal and confirmation, in-memory update, preserved unpaid state, production bundle scan and unavailable preview fixture asset. | Any live cancellation policy requires team approval. |
| Responsive layout | Edge at 1440, 1200, 800, 375 and 320 px. Desktop and mobile captures for list and details. | Direct comparison needs the approved original design image. |
| Routing regressions | Clean and integrated suites reproduce the root and wildcard assertions. | Confirm intended targets with maintainers. |
