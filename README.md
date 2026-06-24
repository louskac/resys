# ReSys — SaaS Tenant Reservation Portal

ReSys is a premium, multi-tenant reservation and scheduling SaaS platform designed for high-end sports complexes, fitness studios, educational courses, and ticketing hubs. It features a fully responsive, modern web dashboard, SSO authentication, and advanced date-based scheduling grids.

---

## Key Features

* **Multi-Tenant System**: Dynamically resolves theme colors, metadata, and vertical rules (e.g., the turf-green brand styling for **Umělka Pardubice**).
* **Interactive Scheduler**:
 * **Day, Week, and Month Views**: Dynamically switch grid columns and controls to view schedules by day (single-column), week (7-day calendar), or month (42-day calendar overview).
 * **"Today" Return Button**: Dynamically fades in a **"Dnes"** button when navigating away from current date scopes, returning the user instantly upon click.
 * **Drag-to-Book**: Supports drag-selecting slot intervals on the grid to auto-configure reservation durations.
* **Premium Calendar Aesthetics**:
 * **"Now Line"**: A live-updating horizontal red indicator line spanning across the active column matching the current local time.
 * **Past Slots Texturing**: Past time cells and events are dimmed, mouse actions are blocked, and cells are filled with a theme-aware **diagonal stripe pattern** (`.bg-stripes-past`) to denote unavailable slots.
 * **Floating Detail Tooltips**: Hovering over events opens rich glassmorphic detail cards positioned dynamically upward or downward to prevent viewport clipping.
* **Authentication**: Seamless Single Sign-On (SSO) integration with OneiD, featuring direct programmatic client logout.
* **Server-Side Validation**:
 * Blocks any reservations targeted in the past.
 * Enforces user limits (Max 2 hours/day and 4 hours/week per tenant).
 * Checks for concurrent sector/area overlapping reservation conflicts using tree-traversal logic.

---

## ️ Technology Stack

* **Frontend Framework**: Next.js (App Router)
* **Styling**: Tailwind CSS
* **Database / ORM**: PostgreSQL & Prisma ORM
* **Authentication**: NextAuth.js (configured for OneiD SSO)
* **Icons**: Lucide React

---

## Project Architecture

```
resys/
├── prisma/ # Prisma database schema and seeds
│ ├── schema.prisma # Database models (Tenant, Resource, Booking, checkins)
│ └── seed.js # Sandbox tenant configurations seed file
└── src/
 ├── app/
 │ ├── api/ # API endpoints (Bookings, scanning devices, OneiD callback)
 │ ├── host/ # SaaS host configurations page
 │ ├── tenants/[id]/ # Dynamic tenant routing context
 │ │ ├── admin/ # Tenant administrator dashboard console
 │ │ └── page.tsx # Public tenant reservation page
 │ ├── globals.css # CSS Variables & custom tailwind rules
 │ └── layout.tsx # Core root layout and theme script init
 ├── components/
 │ ├── CalendarView.tsx# Core scheduler view (Day/Week/Month rendering)
 │ ├── ThemeToggle.tsx # Theme toggling selector (Light/Dark root class controller)
 │ └── LogoutButton.tsx# Custom programmatic client sign-out trigger
 └── lib/
 ├── auth.ts # NextAuth configuration
 └── tenantThemes.ts # Tenant theme mapping rules
```

---

## Local Setup & Development

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and a **PostgreSQL** instance running locally.

### 2. Environment Variables
Create a `.env` file in the root directory and configure the variables (refer to `.env.example`):
```env
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/resys"
NEXTAUTH_SECRET="your-next-auth-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration & Seeding
Run the database migrations and seed default sandbox data:
```bash
# Apply migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### 4. Run Development Server
Start the development server with Next.js Turbopack:
```bash
npm run dev
```
Open [http://localhost:3000/tenants/umelka](http://localhost:3000/tenants/umelka) in your browser.

---

## Booking Validation Reference
The ReSys Booking API checks the following policies server-side in `src/app/api/bookings/route.ts`:
* `PAST_BOOKING_NOT_ALLOWED`: Checked when attempting to book a slot before the current server timestamp.
* `OVERLAP_CONFLICT`: Checked when booking a sector overlaps with active bookings of its parent sector or nested children.
* `DAILY_LIMIT_EXCEEDED` / `WEEKLY_LIMIT_EXCEEDED`: Checked when the user's total active confirmed booking duration exceeds daily (2h) or weekly (4h) limits.
