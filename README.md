# AirManager

[![CI](https://github.com/lodharishab/AirManager/actions/workflows/ci.yml/badge.svg)](https://github.com/lodharishab/AirManager/actions/workflows/ci.yml)

A luxury dark-themed short-term rental property management dashboard built with React, Express, and PostgreSQL.

## Features

- **Dashboard** — KPI cards, revenue charts, booking overview
- **Properties** — Full property management with whole-property and room-based booking modes
- **Bookings** — Reservation tracking with status management (upcoming/current/completed/cancelled)
- **Check-ins** — Today's arrivals and departures at a glance
- **Enquiries** — Guest lead pipeline (new → responded → converted → closed)
- **Messages** — Internal host-guest chat
- **Gallery** — Photo library with tags, star ratings, and Google Drive import
- **Reviews** — Track guest reviews from Airbnb, Booking.com, Google, and direct channels
- **Housekeeping** — Cleaning and maintenance task management
- **Expenses** — Per-property expense tracking for real profit visibility
- **Analytics** — Revenue trends, occupancy charts, booking breakdowns
- **Availability Calendar** — Visual month-view of bookings across all properties
- **Invoices** — Printable booking invoices
- **AI Assistant** — Floating AI chatbot for property management help
- **AI Enrichment** — Auto-fill property details from Airbnb/Booking.com links

## Tech Stack

| Layer      | Technology                                                    |
|------------|---------------------------------------------------------------|
| Frontend   | React 19, Vite 7, TanStack Query, Tailwind CSS 4, shadcn/ui, Recharts, wouter |
| Backend    | Express 5 REST API, express-session (pg-backed)               |
| Database   | PostgreSQL with Drizzle ORM                                   |
| AI         | OpenAI (via Replit AI Integrations)                           |
| Tooling    | TypeScript 5.6, ESLint 8, Prettier 3                         |

## Design

Luxury black and gold dark theme — Cormorant Garamond + Montserrat typography, `hsl(43 60% 55%)` gold primary color.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/lodharishab/AirManager.git
   cd AirManager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see [Environment Variables](#environment-variables) below).

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The app runs on `http://localhost:5000`.

## Environment Variables

| Variable                          | Required | Description                                      |
|-----------------------------------|----------|--------------------------------------------------|
| `DATABASE_URL`                    | Yes      | PostgreSQL connection string                     |
| `SESSION_SECRET`                  | Yes      | Secret for express-session cookie signing        |
| `AI_INTEGRATIONS_OPENAI_API_KEY`  | No       | OpenAI API key (via Replit AI Integrations)       |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | No       | OpenAI base URL (via Replit AI Integrations)      |

## Available Scripts

| Script          | Description                                |
|-----------------|--------------------------------------------|
| `npm run dev`   | Start the development server               |
| `npm run build` | Build for production                       |
| `npm start`     | Run the production build                   |
| `npm run check` | TypeScript type checking                   |
| `npm run db:push` | Push Drizzle schema to the database      |
| `npm run lint`  | Run ESLint on TypeScript/React files       |
| `npm run format`| Format code with Prettier                  |

## API Endpoints

### Public

| Method | Endpoint               | Description                  |
|--------|------------------------|------------------------------|
| GET    | `/api/health`          | Server health check          |
| POST   | `/api/auth/register`   | Register a new user          |
| POST   | `/api/auth/login`      | Login                        |
| POST   | `/api/auth/logout`     | Logout                       |
| GET    | `/api/auth/me`         | Get current session user     |

### Authenticated (require session)

| Method | Endpoint                               | Description                        |
|--------|----------------------------------------|------------------------------------|
| GET    | `/api/properties`                      | List all properties                |
| POST   | `/api/properties`                      | Create a property                  |
| GET    | `/api/properties/:id`                  | Get property with rooms/bookings/links |
| PATCH  | `/api/properties/:id`                  | Update a property                  |
| DELETE | `/api/properties/:id`                  | Delete a property                  |
| POST   | `/api/properties/:id/ai-enrich`        | AI-enrich property from links      |
| GET    | `/api/bookings`                        | List all bookings                  |
| POST   | `/api/bookings`                        | Create a booking                   |
| PATCH  | `/api/bookings/:id`                    | Update a booking                   |
| DELETE | `/api/bookings/:id`                    | Delete a booking                   |
| GET    | `/api/rooms/:propertyId`               | List rooms for a property          |
| POST   | `/api/rooms`                           | Create a room type                 |
| PATCH  | `/api/rooms/:id`                       | Update a room type                 |
| DELETE | `/api/rooms/:id`                       | Delete a room type                 |
| GET    | `/api/conversations`                   | List conversations                 |
| POST   | `/api/conversations`                   | Create a conversation              |
| GET    | `/api/conversations/:id/messages`      | Get messages in a conversation     |
| POST   | `/api/messages`                        | Send a message                     |
| GET    | `/api/gallery`                         | List gallery images                |
| POST   | `/api/gallery`                         | Add a gallery image                |
| PATCH  | `/api/gallery/:id`                     | Update a gallery image             |
| DELETE | `/api/gallery/:id`                     | Delete a gallery image             |
| POST   | `/api/gallery/import-drive`            | Import images from Google Drive    |
| GET    | `/api/enquiries`                       | List enquiries                     |
| POST   | `/api/enquiries`                       | Create an enquiry                  |
| PATCH  | `/api/enquiries/:id`                   | Update an enquiry                  |
| DELETE | `/api/enquiries/:id`                   | Delete an enquiry                  |
| GET    | `/api/reviews`                         | List reviews                       |
| POST   | `/api/reviews`                         | Create a review                    |
| PATCH  | `/api/reviews/:id`                     | Update a review                    |
| DELETE | `/api/reviews/:id`                     | Delete a review                    |
| GET    | `/api/expenses`                        | List expenses                      |
| POST   | `/api/expenses`                        | Create an expense                  |
| PATCH  | `/api/expenses/:id`                    | Update an expense                  |
| DELETE | `/api/expenses/:id`                    | Delete an expense                  |
| GET    | `/api/housekeeping`                    | List housekeeping tasks            |
| POST   | `/api/housekeeping`                    | Create a housekeeping task         |
| PATCH  | `/api/housekeeping/:id`                | Update a housekeeping task         |
| DELETE | `/api/housekeeping/:id`                | Delete a housekeeping task         |
| GET    | `/api/notifications`                   | List notifications                 |
| PATCH  | `/api/notifications/:id/read`          | Mark notification as read          |
| GET    | `/api/revenue`                         | Get revenue data                   |
| GET    | `/api/dashboard`                       | Get dashboard KPIs                 |

## Project Structure

```
├── client/                    # React frontend
│   └── src/
│       ├── pages/             # Route-level page components
│       ├── components/
│       │   ├── ui/            # shadcn/ui primitives
│       │   ├── layout/        # App shell, sidebar, header
│       │   ├── property/      # Property detail sub-components
│       │   └── gallery/       # Gallery sub-components
│       ├── hooks/             # Custom React hooks
│       └── lib/               # API hooks, query client, utilities
├── server/                    # Express backend
│   ├── index.ts               # App entry point, middleware setup
│   ├── routes.ts              # All API endpoints
│   ├── storage.ts             # Database operations (IStorage interface)
│   ├── db.ts                  # Drizzle database connection
│   └── google-drive.ts        # Google Drive import integration
├── shared/
│   └── schema.ts              # Drizzle schema + Zod types (shared)
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline
├── .eslintrc.cjs              # ESLint configuration
├── .prettierrc                # Prettier configuration
└── drizzle.config.ts          # Drizzle Kit configuration
```

## Demo

Switch to the `demo` branch to see the app pre-loaded with sample data across multiple international properties:

```bash
git checkout demo
```

The demo branch includes realistic sample properties, bookings, reviews, expenses, and more — all with generic international data so you can explore every feature immediately.

## CI/CD

A GitHub Actions pipeline runs on every push to `main` and on pull requests. The pipeline executes:

1. **TypeScript type checking** — `npm run check`
2. **ESLint linting** — `npm run lint`
3. **Test suite** — `npm test`
4. **Production build** — `npm run build`

A PostgreSQL 16 service container is provisioned for integration tests that require a real database.

### Branch Protection (Recommended)

To enforce CI checks before merging, enable branch protection on `main`:

1. Go to **Settings → Branches → Add rule**
2. Set **Branch name pattern** to `main`
3. Enable **Require status checks to pass before merging**
4. Select the **ci** status check (displayed as `ci / Lint, Type Check, Test & Build`)
5. Optionally enable **Require branches to be up to date before merging**
