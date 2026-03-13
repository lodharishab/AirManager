# HostSpace - Luxury Rental Property Management Dashboard

## Overview
A luxury black and gold dark-themed Airbnb rental property management dashboard for a Jaipur, India-based business. Tracks properties, bookings, guests, and revenue with INR (₹) currency.

## Architecture
- **Frontend**: React + Vite + TanStack Query + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (API)

## Key Design Choices
- **Theme**: Luxury dark theme ONLY — `class="dark"` hardcoded on `<html>` tag
- **Colors**: Primary gold `hsl(43, 60%, 55%)`, near-black background `hsl(0, 0%, 5%)`
- **Typography**: Cormorant Garamond (serif headings) + Montserrat (sans body)
- **Currency**: INR (₹) throughout — never use $
- **Location**: Jaipur, India context for all properties

## Data Model (shared/schema.ts)
- `properties` — rental listings with full details: name, address, nightly rate, status, occupancy, revenue, description, propertyType, bedrooms, bathrooms, maxGuests, squareFeet, amenities (array), checkInTime, checkOutTime, minimumStay, houseRules, neighborhood
- `propertyLinks` — external links for properties (Airbnb, Booking.com, Google Maps, etc.) with label, url, linkType
- `bookings` — guest reservations linked to properties with check-in/out dates
- `conversations` — guest messaging threads
- `messages` — individual messages within conversations
- `revenueData` — monthly revenue data points for charts
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
- `POST /api/seed` — auto-seeds initial data if DB is empty
- `GET/POST /api/ai-chat/conversations` — AI chatbot conversations
- `GET/DELETE /api/ai-chat/conversations/:id` — single AI conversation
- `POST /api/ai-chat/conversations/:id/messages` — send message, get streaming AI response

## Frontend Pages
- `/` — Dashboard (KPI cards, revenue chart, recent bookings)
- `/properties` — Property grid with create/delete, clickable cards linking to detail
- `/properties/:id` — Property detail page (full info, amenities, house rules, bookings, links management)
- `/bookings` — Bookings table with filters and create dialog
- `/messages` — Chat UI with conversations and messaging
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
- `client/src/index.css` — Tailwind + custom theme variables
- `public/property-*.jpg` — Property images served statically

## AI Chatbot
- Floating button (bottom-right) opens a chat panel
- Uses OpenAI via Replit AI Integrations (gpt-5-mini model)
- System prompt: HostSpace AI property management assistant for Jaipur
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

## Auto-Seeding
The dashboard page auto-triggers `POST /api/seed` when no properties exist, populating:
- 4 properties in Jaipur neighborhoods
- 5 bookings with varied statuses
- 3 guest conversations with sample messages
- 6 months of revenue data
