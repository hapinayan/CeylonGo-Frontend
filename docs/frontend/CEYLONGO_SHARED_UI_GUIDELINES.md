# CeylonGo Shared UI Guidelines & Design System

## 1. Overview & Approved Design Philosophy

**CeylonGo** (*Tagline: "Discover Local. Feel at Home."*) uses a pure, modern, Airbnb-inspired Blue & White design architecture built with **Angular 21**, TypeScript, and SCSS.

The core visual principles are:
- **Clean White Simplicity**: Crisp white cards (`#FFFFFF`) on subtle ambient backgrounds.
- **Ocean & Sky Blue Palette**: Royal Blue (`#0066FF`) for interactive actions, Deep Navy (`#082B5C`) for commanding typography, and Soft Light Blue (`#EAF5FF`) for icon backdrops and banners.
- **Warm Heritage Accents**: Preserved within the authentic CeylonGo brand logo and curated photography, avoiding heavy orange/dark-navy clutter.
- **Gentle Elevation**: Soft ambient shadows (`rgba(8, 43, 92, 0.05)`) with smooth hover micro-interactions (`translateY(-4px)`).
- **High-DPI Responsive Imagery**: 16:10.5 photography with rounded corners and floating action controls.

---

## 2. Design Tokens

### Color Tokens (SCSS & CSS Custom Properties)

| Token Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| `$cg-royal-blue` | `#0066FF` | Primary CTA buttons, active links, interactive highlights |
| `$cg-royal-blue-hover` | `#0052CC` | Button and interactive hover states |
| `$cg-primary-navy` | `#082B5C` | Section headings, card titles, hero text |
| `$cg-light-blue` | `#EAF5FF` | Icon containers, shortcut badges, banner backgrounds |
| `$cg-light-border` | `#D8E8F8` | Card borders, search bar outline, dividers |
| `$cg-white` | `#FFFFFF` | Page surface, card backgrounds, navbar, footer |
| `$cg-text-secondary`| `#64748B` | Subtitles, location descriptions, review counts |
| `$cg-star-gold` | `#F59E0B` | Ratings star icons |
| `$cg-heart-pink` | `#FF385C` | Active wishlist heart toggle fill |

Tokens are defined in `src/styles/_tokens.scss` and mapped to CSS variables in `src/styles.scss`.

### Typography

- **Primary Font Family**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Headings**:
  - Hero H1: `2.45rem` (`39px`), font-weight 800, line-height 1.22.
  - Section H2: `1.45rem` (`23px`), font-weight 800, letter-spacing `-0.015em`.
  - Banner H2: `1.22rem` (`19.5px`), font-weight 800.
  - Card Title H3: `1.02rem` (`16.5px`), font-weight 700.
- **Body & Captions**:
  - Subtitle: `0.95rem` (`15px`), regular 400.
  - Body Text: `0.88rem` (`14px`), regular 400.
  - Location & Meta: `0.82rem` (`13px`), regular 400.
  - Badge / Micro-copy: `0.72rem` (`11.5px`), bold 700.

---

## 3. Core UI Components & Guidelines

### A. Buttons

1. **Royal Blue Primary CTA (`.btn-royal-search`, `.btn-try-ai`, `.btn-register`)**:
   - `background: #0066FF; color: #FFFFFF; font-weight: 700; border-radius: 9999px;`
   - Shadow: `0 4px 16px rgba(0, 102, 255, 0.32);`
   - Hover: `transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 102, 255, 0.42);`
2. **Outlined Blue Action Button (`.btn-join-community`, `.btn-login`)**:
   - `background: #FFFFFF; border: 1.5px solid #0066FF; color: #0066FF; font-weight: 700; border-radius: 9999px;`
   - Hover: `background: #F0F7FF; color: #0052CC; transform: translateY(-1px);`
3. **Floating Wishlist Button (`.btn-wishlist`)**:
   - `width: 34px; height: 34px; border-radius: 50%; background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(6px);`
   - Active: `background: #FFFFFF; svg { fill: #FF385C; stroke: #FF385C; }`
   - Must include `[attr.aria-pressed]` and `[attr.aria-label]` for accessibility.

### B. Form Inputs (Search Bar)

- **Container**: White pill shape (`border-radius: 9999px`), border `1px solid #D8E8F8`, shadow `0 10px 32px rgba(0, 102, 255, 0.08)`.
- **Fields**: Thin vertical dividers (`1px solid #D8E8F8`), small uppercase label (`font-size: 0.75rem; font-weight: 700; color: #082B5C;`), clean frameless input.
- **Focus**: Container elevation `box-shadow: 0 12px 36px rgba(0, 102, 255, 0.16); border-color: rgba(0, 102, 255, 0.45);`.

### C. Listing Cards (`HomestayCard` & `ExperienceCard`)

- **Structure**:
  - Card container: `border-radius: 18px; border: 1px solid #D8E8F8; overflow: hidden; background: #FFFFFF;`
  - Image wrapper: Aspect ratio `16:10.5` (`padding-top: 66%`), `overflow: hidden`.
  - Image: `object-fit: cover; transition: transform 0.35s ease;` (zooms to `1.04` on hover).
  - Content area: `padding: 1rem 1.15rem 1.15rem; display: flex; flex-direction: column;`
  - Title: Bold primary navy (`#082B5C`).
  - Location: Muted secondary text (`#64748B`) with pin icon.
  - Ratings: Gold star (`#F59E0B`), bold rating score, parenthesized review count.
  - Prices (Homestays): Right-aligned bold `LKR X,XXX` with `/ night` caption.

### D. Category Shortcuts

- Circular container (`width: 62px; height: 62px; border-radius: 50%; background: #EAF5FF;`).
- Royal blue icon (`#0066FF`), deep navy label (`#082B5C`).
- Hover: `transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0, 102, 255, 0.16);`.
- Mobile: Horizontal scrollable track with hidden scrollbars.

---

## 4. Shared Component Locations & Reuse Instructions

| Component | Path | Selector | Key Inputs / Outputs |
| :--- | :--- | :--- | :--- |
| **Navbar** | `src/app/shared/components/navbar/navbar.ts` | `<app-navbar />` | Navigation links, language, auth buttons |
| **Footer** | `src/app/shared/components/footer/footer.ts` | `<app-footer />` | Legal routes, support toast, social icons |
| **Category Shortcut** | `src/app/pages/home/components/category-shortcut/category-shortcut.ts` | `<app-category-shortcut [category]="item" />` | Input `category: CategoryShortcutItem` |
| **Homestay Card** | `src/app/pages/home/components/homestay-card/homestay-card.ts` | `<app-homestay-card [homestay]="item" />` | Input `homestay: HomestayItem` |
| **Experience Card** | `src/app/pages/home/components/experience-card/experience-card.ts` | `<app-experience-card [experience]="item" />` | Input `experience: ExperienceItem` |
| **AI Planner Banner**| `src/app/pages/home/components/ai-planner-banner/ai-planner-banner.ts` | `<app-ai-planner-banner (actionClick)="fn()" />` | Output `actionClick` |
| **Community Banner** | `src/app/pages/home/components/community-banner/community-banner.ts` | `<app-community-banner (actionClick)="fn()" />` | Output `actionClick` |

---

## 5. Responsive Breakpoints

| Breakpoint | Target Screen | Layout Behavior |
| :--- | :--- | :--- |
| **> 1200px** | Large Desktop / HD | Max container `1140px`, 4-column listings, side-by-side banners |
| **992px – 1199px** | Small Desktop / Tablet Landscape | Max container `960px`, 4-column listings, responsive search padding |
| **768px – 991px** | Tablet Portrait | 2-column listings, responsive footer wrapping, search bar vertical |
| **480px – 767px** | Large Mobile | 1-column listings, horizontally scrollable category shortcuts |
| **< 480px** | Small Mobile (430, 390, 375, 320px) | Full-width cards, vertically stacked banners, touch-friendly padding |

---

## 6. Accessibility & Keyboard Standards

- **Focus Visible**: All interactive elements (buttons, inputs, links) use a high-contrast outline (`outline: 3px solid rgba(0, 102, 255, 0.45); outline-offset: 2px`).
- **Semantic Headings**: Strict H1 -> H2 -> H3 hierarchy.
- **Reduced Motion**: Honored via `@media (prefers-reduced-motion: reduce)` in `styles.scss`.
- **Touch Targets**: Minimum 44x44px for buttons and touch interactive targets on mobile.
- **Alt Text**: All images must have meaningful, context-rich alternative text.

---

## 7. Image Asset Standards

- Format: **WebP** preferred for photography and illustrations (`quality=88`).
- Proportions:
  - Homestays & Experiences: `16:10.5` aspect ratio (`1200x669px` or `800x500px`).
  - Banners: `900x502px` or clean SVG illustrations.
  - Brand Logo: High-res PNG with transparent background.
- Directory Hierarchy:
  - `public/images/homestays/`
  - `public/images/experiences/`
  - `public/images/banners/`

---

## 8. Integration Rules for Team Members

1. **Patithijan (Homestays & Bike Rental)**:
   - Reuse `HomestayCard` component and `HomestayItem` model for listing views.
   - Target Section Anchors: `#homestays` and `#bike-rentals`.
2. **Anushan (Activities, Experiences & Eco-Tourism)**:
   - Reuse `ExperienceCard` component and `ExperienceItem` model.
   - Target Section Anchor: `#experiences`.
3. **Mithushika (Traveler Authentication, Artisan & Community)**:
   - Reuse existing routes `/login`, `/register`, and `/auth`.
   - Target Section Anchor: `#community`.
4. **Komaruthan (Tour Guides & Admin Management)**:
   - Target Section Anchor: `#tour-guides`.
5. **Hapinayan (Homepage Coordinator, AI Planner & Provider Portal)**:
   - Target Section Anchor: `#ai-planner` / `#ai-trip-planner`.
   - Provider portal remains isolated under `/provider/*`.

*Do not create arbitrary new top-level routes without coordinator approval.*
