# Traveler Wishlist API matrix

Audited from frontend `9c73d78` and backend `origin/develop` source at `22f8912`. The agreed target is the legacy runtime for local development and isolated staging. Paths below start at `/api/v1`. The Academic MVP runtime omits these routers.

| Source | History GET | Save and remove | Scope and paging |
| --- | --- | --- | --- |
| Homestays | `/wishlists/homestays` | POST and DELETE `/wishlists/homestays/{id}` | Traveler role and owner ID. `page`, `page_size` up to 50, and `total`. Item contains `saved_at` and a nested homestay. |
| Eco and Experiences | `/wishlists/me` | POST and DELETE `/wishlists/eco/{id}` | Traveler role and owner ID. `page`, `page_size`, `total_pages`. The compact experience may be absent for an unavailable listing. |
| Bike and Bicycle Rental | `/rental-wishlist` | POST and DELETE `/rental-wishlist/{id}` | Authenticated owner ID in this router. `page`, `limit` up to 50, and `pages`. The dashboard requires an active traveler and retains only the frontend's bike and bicycle types. Server-side provider-role denial needs staging confirmation. |
| Artisan businesses | `/artisan-wishlists/me` | POST and DELETE `/artisan-listings/{id}/wishlist` | Traveler role and owner ID. `page`, `page_size`, and `total_pages`. Listing may be unavailable. |
| Artisan products and services returned by favorites | `/artisan-product-favorites` | PUT and DELETE `/artisan-product-favorites/{id}` | Traveler role and owner ID. `page`, `page_size`, and `total`. Public product filtering is enforced by the backend. A separate experience wishlist was not found. |
| Standalone Activities | Unavailable | Unavailable | The Eco contract covers Eco experiences only. |
| Tour Guides | Unavailable | Unavailable | Existing browser-local favorite flags stay separate from account saved items. |

The dashboard reads all reported pages for a successful source. A source error leaves the other sources visible and exposes a source-specific retry. Counts and filters describe loaded results. It normalizes composite service and item IDs and uses verified service routes for available items. Across currencies, price sorting groups by currency and orders amounts within each group. The available backend fields determine the price, rating, image and detail affordances.
