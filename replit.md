# AirManager - Short-Term Rental Property Management Dashboard

## Overview
A generic, luxury dark-themed short-term rental property management dashboard. Tracks properties, bookings, guests, and revenue with USD ($) currency. No location or region assumptions — works for any city worldwide.

## Architecture
- **Frontend**: React + Vite + TanStack Query + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (API)

## Key Design Choices
- **Theme**: Luxury dark theme ONLY — `class="dark"` hardcoded on `<html>` tag
- **Colors**: Primary gold `hsl(43, 60%, 55%)`, near-black background `hsl(0, 0%, 5%)`
- **Typography**: Cormorant Garamond (serif headings) + Montserrat (sans body)
- **Currency**: USD ($) throughout
- **Location**: Generic/international — no city-specific hardcoding
- **Mobile**: Fully responsive — sidebar collapses to hamburger drawer on mobile (<768px), tables switch to card layouts, forms go single-column, dialogs adapt to screen width, 44px minimum touch targets

## Data Model (shared/schema.ts)
- `properties` — rental listings with full details: name, address, nightly rate, status, occupancy, revenue, description, propertyType, bedrooms, bathrooms, maxGuests, squareFeet, amenities (array), checkInTime, checkOutTime, minimumStay, houseRules, neighborhood
- `propertyLinks` — external links for properties (Airbnb, Booking.com, Google Maps, etc.) with label, url, linkType
- `guests` — guest profiles with name, email, phone, nationality, notes, tags (array), createdAt
- `bookings` — guest reservations linked to properties with check-in/out dates; optional `guestId` FK to guests
- `conversations` — guest messaging threads
- `messages` — individual messages within conversations
- `revenueData` — monthly revenue data points for charts
- `galleryImages` — photo gallery with imageUrl, title, tags (array), starRating, source (manual/google_drive), driveFileId, propertyId (optional)
- `enquiries` — guest enquiries with propertyId, guestName, guestEmail, guestPhone, message, status (new/responded/converted/closed)
- `users` — basic user auth (username/password)
- `userPreferences` — notification settings per user: emailNotifications, pushNotifications, bookingAlerts, messageAlerts, notificationEmail
- `ai_conversations` — AI chatbot conversation threads (shared/models/chat.ts)
- `ai_messages` — AI chatbot messages with role (user/assistant) (shared/models/chat.ts)

## Testing
- **Framework**: Vitest with TypeScript support
- **Run tests**: `npx vitest run`
- **Test files**: `tests/` directory
  - `tests/schema.test.ts` — Zod insert schema validation tests
  - `tests/storage.test.ts` — DatabaseStorage CRUD unit tests
  - `tests/api.test.ts` — API route integration tests (auth, properties, bookings)
  - `tests/setup.ts` — Global test setup (DB cleanup, environment safety guard)
  - `tests/helpers/factories.ts` — Test data factories
  - `tests/helpers/test-app.ts` — Express app factory for API tests
- **Config**: `vitest.config.ts` with path aliases matching `@shared/*` and `@/*`
- **Logging**: `server/logger.ts` — extracted log/logStructured functions (avoids circular imports in tests)

## API Routes (server/routes.ts)
All prefixed with `/api`. List endpoints support server-side pagination via `page` and `limit` query params and return `{ data, total, page, limit }`.

- `GET/POST /api/properties` — list/create properties (supports `search` param for name/address/neighborhood)
- `GET/PATCH/DELETE /api/properties/:id` — single property CRUD
- `GET/POST /api/bookings` — list/create bookings (supports `search`, `status`, `startDate`, `endDate` params)
- `GET/PATCH/DELETE /api/bookings/:id` — single booking CRUD
- `GET/POST /api/conversations` — list/create conversations
- `GET /api/conversations/:id/messages` — get messages for conversation
- `POST /api/messages` — send a message
- `GET /api/revenue` — monthly revenue chart data (static revenueData table)
- `GET /api/dashboard/stats` — aggregated dashboard KPIs (revenue dynamically calculated from bookings)
- `GET /api/dashboard/revenue-chart` — revenue by month from bookings (fallback to revenueData table)
- `GET/POST /api/gallery` — list/create gallery images
- `PATCH/DELETE /api/gallery/:id` — update/delete gallery image
- `GET /api/gallery/property/:propertyId` — images by property
- `POST /api/gallery/import-drive` — import images from Google Drive folder
- `GET/POST /api/enquiries` — list/create enquiries (paginated)
- `GET/PATCH/DELETE /api/enquiries/:id` — single enquiry CRUD (status: new/responded/converted/closed)
- `GET/POST /api/guests` — list/create guest profiles (supports `search` param for name/email/phone)
- `GET/PATCH/DELETE /api/guests/:id` — single guest CRUD with aggregated stats (totalStays, totalSpent, lastVisit, bookings, reviews)
- `GET /api/guests/top` — top guests by booking count
- `GET/POST /api/reviews` — list/create reviews (supports `search` param for full-text search on reviewText/guestName)
- `GET/POST /api/ai-chat/conversations` — AI chatbot conversations
- `GET/DELETE /api/ai-chat/conversations/:id` — single AI conversation
- `POST /api/ai-chat/conversations/:id/messages` — send message, get streaming AI response

## Frontend Pages
- `/` — Dashboard (KPI cards, revenue chart, recent bookings; shows welcome empty state when no properties exist)
- `/properties` — Property grid with create/delete, clickable cards linking to detail
- `/properties/:id` — Property detail page (full info, amenities, house rules, bookings, links management)
- `/bookings` — Bookings table with filters, create dialog with guest autocomplete
- `/guests` — Guest profiles list with search, stats (total stays, total spent, last visit)
- `/guests/:id` — Guest detail with editable profile, booking history, reviews
- `/messages` — Chat UI with conversations and messaging
- `/gallery` — Photo gallery with search, tag/star/property filters, add/edit/delete, Google Drive import
- `/enquiries` — Enquiry management with table view, status tracking, search/filter, add/delete
- `/reviews` — Guest reviews with ratings, platform badges, filters
- `/settings` — Account, notifications (email config + preference toggles), security tabs

## Security & Configuration
- `server/config.ts` — Centralized env var validation; exports typed `config` object. Validates DATABASE_URL (required), warns for missing SESSION_SECRET, AI_INTEGRATIONS_OPENAI_API_KEY, GOOGLE_DRIVE_API_KEY.
- **CORS**: Configured via `cors` package in `server/index.ts` with origin whitelist (localhost in dev, PRODUCTION_DOMAIN in prod).
- **Rate Limiting**: `express-rate-limit` applied to all `/api` routes (200 req/15min), stricter limits on AI endpoints `/api/ai-chat` and `/api/properties/:id/ai-enrich` (30 req/15min), and Google Drive import `/api/gallery/import-drive` (20 req/15min).
- **Graceful Degradation**: AI and Google Drive routes return 503 with informative messages when API keys are missing, instead of crashing.

## Key Files
- `shared/schema.ts` — Drizzle schema + Zod validation (exports models/chat.ts)
- `shared/models/chat.ts` — AI chatbot schema (ai_conversations, ai_messages)
- `server/config.ts` — Centralized environment validation and typed configuration
- `server/db.ts` — PostgreSQL connection via pg + drizzle (uses config.databaseUrl)
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface
- `server/routes.ts` — Express API routes (includes GET /api/health public endpoint)
- `server/replit_integrations/chat/` — AI chatbot routes and storage (OpenAI integration)
- `client/src/lib/api.ts` — TanStack Query hooks for all API calls
- `client/src/lib/queryClient.ts` — Query client config with apiRequest helper
- `client/src/components/ai-chatbot.tsx` — Floating AI chatbot widget
- `client/src/components/property/` — Property detail sub-components (PropertyHeader, PropertyHero, PropertyStats, PropertyAbout, PropertyRooms, PropertyBookings, PropertyReviews, PropertyLinks, PropertyQuickStats, PropertyEditDialog, PropertyEnrichDialog)
- `client/src/components/gallery/` — Gallery sub-components (GalleryHeader, GalleryFilters, GalleryGrid, GalleryDetailDialog, GalleryEditDialog)
- `client/src/pages/gallery.tsx` — Photo gallery page (orchestrates gallery sub-components)
- `server/google-drive.ts` — Google Drive folder import (ready for when API key is configured)
- `client/src/index.css` — Tailwind + custom theme variables
- `public/property-*.jpg` — Property images served statically
- `.eslintrc.cjs` — ESLint configuration (TypeScript + React)
- `.prettierrc` — Prettier configuration

## Export & Reporting
- **CSV Exports**: Bookings and expenses can be exported as CSV files with current filters applied
  - `GET /api/export/bookings` — CSV export with search/status/date filters
  - `GET /api/export/expenses` — CSV export with property/category/date filters
- **PDF Revenue Report**: Monthly revenue summary with AirManager branding, property breakdown, and totals
  - `GET /api/export/revenue-report` — PDF export with date range and property filters
- Export utility in `server/export.ts` — CSV generation with proper escaping, PDF via pdfkit
- Frontend buttons on Bookings, Expenses, and Analytics pages with loading states
- Dependencies: `pdfkit` for server-side PDF generation

## AI Chatbot
- Floating button (bottom-right) opens a chat panel
- Uses OpenAI via Replit AI Integrations (gpt-5-mini model)
- System prompt: AirManager AI — generic property management assistant, USD currency
- Streaming responses via SSE
- Conversation persistence in `ai_conversations`/`ai_messages` tables
- API prefix: `/api/ai-chat/` (separate from guest messaging at `/api/conversations`)

## AI Property Enrichment
- On property detail page, "AI Enrich" button appears when links are saved
- Fetches content from all saved links (Airbnb, Booking.com, etc.)
- AI extracts structured property data (description, amenities, bedrooms, etc.)
- User reviews extracted fields with checkboxes before applying
- Shows current vs. new values with NEW/UPDATE badges
- API: `POST /api/properties/:id/ai-enrich` (streaming SSE)

## Email Notifications
- **Service**: Resend API for transactional emails (requires `RESEND_API_KEY` env var)
- **Module**: `server/email.ts` — sendEmail function + HTML template builders
- **Templates**: Check-in reminder, new enquiry, booking confirmation, overdue task warning
- **Branding**: Navy/indigo gradient header, AirManager styling, inline CSS
- **Triggers**: Emails sent on booking creation, enquiry creation, and notification generation (check-ins, overdue tasks)
- **Preferences**: Respects user's `emailNotifications` toggle and event-specific toggles (`bookingAlerts`, `messageAlerts`)
- **Config**: `notificationEmail` field in `user_preferences` table, configurable via Settings > Notifications
- **Graceful degradation**: Logs warning when RESEND_API_KEY not configured; email failures never block notification creation

## CI/CD
- **GitHub Actions**: `.github/workflows/ci.yml` runs on push to `main` and PRs
- **Steps**: TypeScript check → ESLint → Tests (if test files exist) → Production build
- **Services**: PostgreSQL 16 service container for integration tests
- **Node.js**: v20

## Empty State
The dashboard shows a welcome card ("Get started by adding your first property") when no properties exist. There is no auto-seeding — the app starts clean. Demo data is on a separate demo branch.
