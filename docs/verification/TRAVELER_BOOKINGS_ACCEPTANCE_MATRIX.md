# Traveler Bookings Acceptance Matrix

| Requirement | Local evidence | External or remaining work |
| --- | --- | --- |
| Unified dashboard and detail | Six typed adapters with service-scoped IDs, separate booking and payment statuses, read-only details. | Live staging verification for each service. Enriched details depend on backend fields. |
| Search and counts | Combined URL-backed filters, counts over the loaded scope, partial failures and isolated retry verified with HTTP mocks. | Verify staging data, actual lifecycle variants and paging beyond first-page scope if requested. |
| Authentication | Guard and mocked guest/provider denial, active traveler check, session replacement and cancellation of stale HTTP responses. | Authorized user and foreign-owner staging checks, expired tokens and CORS. |
| Navigation | Existing profile menu points to My Bookings. Shared navbar/footer and auth are reused. Back link preserves query and remembers list scroll within the same session. | A dedicated profile or settings route remains unavailable on the selected base. |
| Development preview | Six sample rows, query opt-in in development, fixture labels and no API calls in Edge. Production guest preview requests return to the homepage, and fixture strings are absent from build. | None for local fixture isolation. |
| Responsive layout | Edge widths 1440, 1200, 800, 375, 320. Full-page desktop and mobile captures saved outside the trees. | Reference image unavailable, so visual comparison remains pending. |
| External actions | No reservation, payment, cancellation or refund mutations were introduced. | Product approvals and isolated SQL Server and authorized PayHere checks remain required for existing service integration. |

## Phase 02

| Requirement | Local evidence | External or remaining work |
| --- | --- | --- |
| Dashboard and detail refinement | Dedicated service and payment panels, labeled status, available policy fields, readable cards, navigation and keyboard-focus states. | Original visual reference was unavailable. |
| Read-only management | Owner-scoped Eco and Tour Guide refund history, guide refund estimate, recorded payment/cancellation details, on-demand Homestay and Guide business contact. | Confirm actual staging roles, publication and data completeness. See the [actions matrix](TRAVELER_BOOKINGS_ACTIONS_MATRIX.md). |
| Simulated cancellation | Confirmation, keep/Escape, in-memory update, payment state unchanged, sample-only data and no booking API calls. | Live cancellation, payments, refunds and receipts remain outside this phase. |
| History and security | Duplicate rows are removed by service plus original ID. First-page scope remains explicit, failures have isolated retry, and stale detail/contact reads are cancelled at session change. | Backend ownership and live authorization checks remain open. |
