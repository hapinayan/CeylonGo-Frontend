# CeylonGo Local Tour Guide Traveler Frontend: API Integration Specification

> **STATUS NOTICE: [UNCONFIRMED PROPOSAL - PENDING BACKEND IMPLEMENTATION]**  
> All endpoints, URL paths, query parameters, payload structures, and response schemas documented in this specification represent proposed contracts designed to seamlessly integrate with the CeylonGo-Frontend. These contracts have **NOT** yet been implemented in `CeylonGo-Backend`. The frontend currently operates in **Explicit Mock/Demo Mode** using a typed 128-record local dataset.

---

## 1. Architectural Overview & Configuration

The CeylonGo Tour Guide feature utilizes an Angular 21 Signals-based reactive architecture with dedicated separation of concerns:

- **Mock Dataset**: `src/app/core/mock/tour-guides.mock.ts` (128 verified local guide personas with ratings, categories, locations, pricing, and languages).
- **Domain & DTO Models**: `src/app/core/models/tour-guide.models.ts`.
- **Reactive Service**: `src/app/core/services/tour-guide.service.ts`.
- **Discover Page Component**: `src/app/pages/tour-guides/tour-guides.component.ts`.

### Explicit Mode Configuration
The frontend never guesses or silently masks live API failures with mock records. Operating mode is strictly driven by environment configuration:

- **`src/environments/environment.ts`**:
  ```typescript
  export const environment = {
    production: true,
    apiBaseUrl: 'http://localhost:8000/api/v1',
    features: {
      tourGuidesApiMode: 'mock' // Toggle to 'live' when backend endpoints are deployed
    }
  };
  ```

When set to `'mock'`:
- The service loads the curated 128-record mock dataset.
- Filters, search, pagination, and sorting operate in-memory with sub-millisecond responsiveness.
- Booking inquiries present an explicit `[DEMO MODE]` badge with clear disclaimers that no real reservation or payment was processed.

When set to `'live'`:
- The service invokes `HttpClient.get<BackendTourGuidePaginationResponse>(`${environment.apiBaseUrl}/tour-guides`)`.
- If the endpoint returns 404 or fails, the error message is preserved and surfaced via `guideService.errorMessage()`.
- The user is presented with an error card and a "Retry Connection" action. Mock data is **never** silently substituted.

---

## 2. Proposed Backend Endpoints & Contracts

### 2.1. Tour Guide Discover & Search
- **Endpoint**: `GET /api/v1/tour-guides`
- **Authentication**: Optional (Public access for browsing; traveler token optional for personalized wishlist indicators)
- **Status**: `[UNCONFIRMED PROPOSAL - PENDING BACKEND IMPLEMENTATION]`

#### Query Parameters:
| Parameter | Type | Required | Default | Description |
|:---|:---|:---:|:---:|:---|
| `page` | integer | No | `1` | 1-based page index |
| `page_size` | integer | No | `8` | Items per page (8 per page matches approved 4-column card grid) |
| `query` | string | No | `null` | Keyword search matching name, headline, bio, or specialties |
| `location` | string | No | `null` | City or district (e.g. `Kandy`, `Ella`, `Galle`, `Sigiriya`) |
| `category_id` | string | No | `all` | Category ID (e.g. `nature-hiking`, `culture-heritage`, `wildlife-safari`) |
| `date` | string | No | `null` | Desired tour date (`YYYY-MM-DD` or quick filter identifier) |
| `travelers` | integer | No | `1` | Number of travelers |
| `min_price` | number | No | `null` | Minimum daily fee in LKR |
| `max_price` | number | No | `null` | Maximum daily fee in LKR |
| `languages` | string | No | `null` | Comma-separated languages (e.g. `English,German`) |
| `verified_only`| boolean | No | `false` | When `true`, filters to SLTDA and CeylonGo credential-verified guides |
| `sort_by` | string | No | `top_rated`| One of: `top_rated`, `price_asc`, `price_desc`, `experience` |

#### Proposed Response Schema (`200 OK`):
```json
{
  "total": 128,
  "page": 1,
  "page_size": 8,
  "total_pages": 16,
  "items": [
    {
      "id": "guide-1",
      "full_name": "Chaminda Perera",
      "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      "cover_image_url": "/images/sigiriya.jpg",
      "is_verified": true,
      "rating": 4.9,
      "reviews_count": 214,
      "experience_years": 7,
      "languages": ["English", "Sinhala"],
      "price_per_day": 8000,
      "currency": "LKR",
      "district": "Kandy",
      "city": "Kandy",
      "category_ids": ["culture-heritage", "sightseeing", "nature-hiking"],
      "headline": "Kandy Cultural Heritage & Knuckles Trekking Specialist",
      "about": "National Tour Guide Lecturer registered with Sri Lanka Tourism Development Authority (SLTDA).",
      "specialties": [
        "Temple of the Tooth Relic Guided Walks",
        "Knuckles Mountain Range Day Treks",
        "Ceylon Tea History & Factory Visits"
      ],
      "phone": "+94 77 123 4567",
      "email": "chaminda.perera@ceylongo.example.lk",
      "is_favorite": false
    }
  ]
}
```

---

### 2.2. Single Tour Guide Profile & Details
- **Endpoint**: `GET /api/v1/tour-guides/{id}`
- **Authentication**: Optional
- **Status**: `[UNCONFIRMED PROPOSAL - PENDING BACKEND IMPLEMENTATION]`

#### Proposed Response Schema (`200 OK`):
```json
{
  "id": "guide-1",
  "full_name": "Chaminda Perera",
  "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "cover_image_url": "/images/sigiriya.jpg",
  "is_verified": true,
  "rating": 4.9,
  "reviews_count": 214,
  "experience_years": 7,
  "languages": ["English", "Sinhala"],
  "price_per_day": 8000,
  "currency": "LKR",
  "district": "Kandy",
  "city": "Kandy",
  "category_ids": ["culture-heritage", "sightseeing", "nature-hiking"],
  "headline": "Kandy Cultural Heritage & Knuckles Trekking Specialist",
  "about": "National Tour Guide Lecturer registered with Sri Lanka Tourism Development Authority (SLTDA). Passionate about sharing the rich cultural tapestry of the Hill Country.",
  "specialties": [
    "Temple of the Tooth Relic Guided Walks",
    "Knuckles Mountain Range Day Treks",
    "Ceylon Tea History & Factory Visits",
    "Secret Forest Monasteries"
  ],
  "phone": "+94 77 123 4567",
  "email": "chaminda.perera@ceylongo.example.lk",
  "sltda_registration_no": "SLTDA/TGL/2019/0428",
  "is_favorite": false
}
```

---

### 2.3. Tour Guide Categories
- **Endpoint**: `GET /api/v1/tour-guides/categories`
- **Authentication**: Optional
- **Status**: `[UNCONFIRMED PROPOSAL - PENDING BACKEND IMPLEMENTATION]`

#### Proposed Response Schema (`200 OK`):
```json
[
  { "id": "all", "name": "All Guides", "icon": "grid", "count": 128 },
  { "id": "nature-hiking", "name": "Nature & Hiking", "icon": "mountain", "count": 42 },
  { "id": "culture-heritage", "name": "Culture & Heritage", "icon": "temple", "count": 38 },
  { "id": "sightseeing", "name": "Sightseeing", "icon": "camera", "count": 56 },
  { "id": "eco-tourism", "name": "Eco-Tourism", "icon": "leaf", "count": 24 },
  { "id": "beach-coastal", "name": "Beach & Coastal", "icon": "wave", "count": 30 },
  { "id": "adventure-tours", "name": "Adventure Tours", "icon": "route", "count": 19 },
  { "id": "city-tours", "name": "City Tours", "icon": "car", "count": 27 }
]
```

---

### 2.4. Booking Inquiry Submission
- **Endpoint**: `POST /api/v1/tour-guides/{id}/inquiries`
- **Authentication**: Required (`Authorization: Bearer <JWT>`)
- **Status**: `[UNCONFIRMED PROPOSAL - PENDING BACKEND IMPLEMENTATION]`

#### Proposed Request Payload:
```json
{
  "tour_date": "2026-12-05",
  "duration_days": 1,
  "travelers_count": 2,
  "special_notes": "Interested in visiting Knuckles Range viewpoint and botanical gardens.",
  "estimated_total": 8000,
  "currency": "LKR"
}
```

#### Proposed Response Schema (`201 Created`):
```json
{
  "inquiry_id": "inq-98421",
  "guide_id": "guide-1",
  "traveler_id": "user-456",
  "status": "pending_guide_confirmation",
  "created_at": "2026-11-24T03:30:00Z",
  "message": "Tour inquiry submitted successfully. The guide will respond shortly."
}
```

---

### 2.5. Wishlist & Saved Guides
- **Endpoints**:
  - `GET /api/v1/traveler/wishlist/guides` (Fetch saved guide IDs for authenticated traveler)
  - `POST /api/v1/traveler/wishlist/guides/{guide_id}` (Toggle guide saved status)
- **Authentication**: Required (`Authorization: Bearer <JWT>`)
- **Status**: `[UNCONFIRMED PROPOSAL - PENDING BACKEND IMPLEMENTATION]`
- **Frontend Current Handling**: Wishlist is persisted locally in `localStorage` under key `ceylongo_favorite_guides`. When backend endpoints are deployed, `TourGuideService` can sync the local set with the backend on traveler login.

---

## 3. Data Model Adapter & Field Normalization

The frontend implements an adapter function `mapBackendItemToTourGuide` in `TourGuideService` that maps `snake_case` backend properties to camelCase frontend domain models:

| Backend Field (`snake_case`) | Frontend Field (`camelCase`) | Transformation / Default |
|:---|:---|:---|
| `id` | `id` | `String(item.id)` |
| `full_name` | `name` | Direct string |
| `avatar_url` | `avatarUrl` | Fallback to default avatar image |
| `cover_image_url` | `coverImageUrl` | Fallback to `/images/sigiriya.jpg` |
| `is_verified` | `verified` | Boolean check |
| `rating` | `rating` | Numeric (e.g. 4.9) |
| `reviews_count` | `reviewsCount` | Numeric integer |
| `experience_years` | `experienceYears`| Numeric integer |
| `languages` | `languages` | Array of strings, fallback to `['English']` |
| `price_per_day` | `pricePerDay` | Numeric LKR amount |
| `currency` | `currency` | Defaults to `'LKR'` |
| `city`, `district` | `location` | Formatted as `${city}, ${district}` |
| `category_ids` | `categoryIds` | Array of category IDs |
| `headline` | `headline` | String |
| `about` | `about` | String bio |
| `specialties` | `specialties` | Array of highlights |
| `phone`, `email` | `phone`, `email` | Direct string |

---

## 4. UI States & Fallback Handling

1. **Loading State**: Displays 8 skeleton placeholder cards with subtle shimmer animations matching the approved 4-column card grid.
2. **Empty State**: Rendered when filters (location, category, date, language, price) match zero guides. Offers an action button to "Reset All Filters".
3. **Error State**: Rendered if `apiMode === 'live'` and backend returns 4xx/5xx or is unreachable. Features an explicit error title, error description, and a "Retry Connection" button.
4. **Image Fallback**: If an image fails to load, `(error)="onImageError($event)"` automatically replaces the target `src` with `/images/sigiriya.jpg`.
5. **Demo Booking Safety**: The booking modal prominently features a yellow `[DEMO INQUIRY MODE]` warning banner stating: *"Frontend demonstration only. No payment is charged and no reservation is placed on the backend."* The success modal explicitly confirms simulated status.

---

## 5. Steps to Activate Live Backend Integration

When the CeylonGo backend team implements the Tour Guide API endpoints:
1. Ensure CORS allows frontend requests from `http://localhost:4200` (development) and production origins.
2. Verify endpoints conform to the schemas documented in Section 2.
3. In `src/environments/environment.ts` and `src/environments/environment.development.ts`, change:
   ```typescript
   features: {
     tourGuidesApiMode: 'live'
   }
   ```
4. Rebuild or reload the Angular application. The application will immediately communicate with the live backend with zero UI changes required.
