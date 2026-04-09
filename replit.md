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

## Data Model (shared/schema.ts)
- `properties` — rental listings with full details: name, address, nightly rate, status, occupancy, revenue, description, propertyType, bedrooms, bathrooms, maxGuests, squareFeet, amenities (array), checkInTime, checkOutTime, minimumStay, houseRules, neighborhood
- `propertyLinks` — external links for properties (Airbnb, Booking.com, Google Maps, etc.) with label, url, linkType
- `bookings` — guest reservations linked to properties with check-in/out dates
- `conversations` — guest messaging threads
- `messages` — individual messages within conversations
- `revenueData` — monthly revenue data points for charts
- `galleryImages` — photo gallery with imageUrl, title, tags (array), starRating, source (manual/google_drive), driveFileId, propertyId (optional)
- `enquiries` — guest enquiries with propertyId, guestName, guestEmail, guestPhone, message, status (new/responded/converted/closed)
- `users` — basic user auth (username/password)
- `ai_conversations` — AI chatbot conversation threads (shared/models/chat.ts)
- `ai_messages` — AI chatbot messages with role (user/assistant) (shared/models/chat.ts)

## API Routes (server/routes.ts)
All prefixed with `/api`:
- `GET/POST /api/properties` — list/create properties
- `GET/PATCH/DELETE /api/properties/:id` — single property CRUD
- `GET/POST /api/bookings` — list/create bookings
- `GET/PATCH/DELETE /api/bookings/:id` — single booking CRUD
- `GET/POST /api/conversations` — list/create conversations
- `GET /api/conversations/:id/messages` — get messages for conversation
- `POST /api/messages` — send a message
- `GET /api/revenue` — monthly revenue chart data
- `GET /api/dashboard/stats` — aggregated dashboard KPIs
- `GET/POST /api/gallery` — list/create gallery images
- `PATCH/DELETE /api/gallery/:id` — update/delete gallery image
- `GET /api/gallery/property/:propertyId` — images by property
- `POST /api/gallery/import-drive` — import images from Google Drive folder
- `GET/POST /api/enquiries` — list/create enquiries
- `GET/PATCH/DELETE /api/enquiries/:id` — single enquiry CRUD (status: new/responded/converted/closed)
- `GET/POST /api/ai-chat/conversations` — AI chatbot conversations
- `GET/DELETE /api/ai-chat/conversations/:id` — single AI conversation
- `POST /api/ai-chat/conversations/:id/messages` — send message, get streaming AI response

## Frontend Pages
- `/` — Dashboard (KPI cards, revenue chart, recent bookings; shows welcome empty state when no properties exist)
- `/properties` — Property grid with create/delete, clickable cards linking to detail
- `/properties/:id` — Property detail page (full info, amenities, house rules, bookings, links management)
- `/bookings` — Bookings table with filters and create dialog
- `/messages` — Chat UI with conversations and messaging
- `/gallery` — Photo gallery with search, tag/star/property filters, add/edit/delete, Google Drive import
- `/enquiries` — Enquiry management with table view, status tracking, search/filter, add/delete
- `/reviews` — Guest reviews with ratings, platform badges, filters
- `/settings` — Account, notifications, billing, security tabs

## Key Files
- `shared/schema.ts` — Drizzle schema + Zod validation (exports models/chat.ts)
- `shared/models/chat.ts` — AI chatbot schema (ai_conversations, ai_messages)
- `server/db.ts` — PostgreSQL connection via pg + drizzle
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface
- `server/routes.ts` — Express API routes
- `server/replit_integrations/chat/` — AI chatbot routes and storage (OpenAI integration)
- `client/src/lib/api.ts` — TanStack Query hooks for all API calls
- `client/src/lib/queryClient.ts` — Query client config with apiRequest helper
- `client/src/components/ai-chatbot.tsx` — Floating AI chatbot widget
- `client/src/pages/gallery.tsx` — Photo gallery page with filters, tags, ratings
- `server/google-drive.ts` — Google Drive folder import (ready for when API key is configured)
- `client/src/index.css` — Tailwind + custom theme variables
- `public/property-*.jpg` — Property images served statically

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

## Empty State
The dashboard shows a welcome card ("Get started by adding your first property") when no properties exist. There is no auto-seeding — the app starts clean. Demo data is on a separate demo branch.
