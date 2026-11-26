# Traveler Wishlist acceptance matrix

| Requirement | Local verification | External dependency |
| --- | --- | --- |
| Responsive account dashboard | Shared premium navbar and account sidebar, service filters, search, sorting and composite keys. Six viewport widths from 320 to 1536 px. | Visual sign-off if required. |
| Verified read contracts | Read and paginate supported legacy sources. Keep successful sources visible when another fails. | Isolated legacy staging with representative owned records. |
| Save and remove | Reuse the service clients. Mocked transport and in-memory preview changes. Existing global account mutation is never used in local verification. | Verify each discovery and detail action against isolated synthetic accounts. |
| Role and owner | Traveler guard, result association with the current session, and cancellation of stale requests. | Real JWT login, foreign owner, provider-role denial, and CORS checks. |
| Navigation | Shared profile and sidebar links, existing service detail paths, URL filter state and recorded scroll position. | Unavailable source records require the service to make their listing public again. |
| Fixture isolation | Production guest route rejects the preview query; sample strings and preview-only asset paths checked in the production output. | Keep shared illustrative images labeled in appropriate usage. |
| Availability gaps | Standalone Activity and Tour Guide account favorites are disclosed as unsupported. | Backend contracts required before adding those integrations. |
