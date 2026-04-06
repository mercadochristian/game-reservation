# Volleyball Game Reservation System

A full-stack web application for managing volleyball game reservations, player registrations, and game-day operations. Supports three user roles: **Admin**, **Facilitator**, and **Player**.

## Features

- **Admin** — Schedule management, location management, user management (including ban/unban), payment verification, player registration, activity logs
- **Facilitator** — QR code attendance scanning, team lineup builder, MVP awards
- **Player** — Browse schedules, solo and group registration, payment proof upload, registration history, profile management

## Tech Stack

- **Frontend** — Next.js 15 + React 19 + TypeScript 5 + Tailwind CSS v4
- **Backend** — Supabase (PostgreSQL + email/password auth)
- **Forms** — React Hook Form + Zod validation
- **Animations** — Framer Motion v12
- **UI** — Custom shadcn-style components on `@base-ui/react` primitives
- **Testing** — Vitest (unit) + Playwright (E2E)

## Quick Start

### Prerequisites
- Node.js 18+
- npm
- Supabase account + project

### Installation

1. **Clone and install:**
   ```bash
   git clone git@github.com:mercadochristian/game-reservation.git
   cd game-reservation
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase URL and keys
   ```

3. **Set up Supabase** — See [docs/setup/INITIAL_SETUP.md](docs/setup/INITIAL_SETUP.md)

4. **Run dev server:**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint
npm run test             # Run unit tests (Vitest)
npm run test:watch       # Unit tests in watch mode
npm run test:coverage    # Unit test coverage report
npx playwright test      # Run E2E tests
```

## Project Structure

```
src/
├── app/
│   ├── auth/                     # Sign in / sign up
│   ├── create-profile/           # New player profile setup
│   ├── waiver/                   # Waiver agreement
│   ├── register/[scheduleId]/    # Player self-registration for a game
│   ├── dashboard/                # Role-aware unified dashboard
│   │   ├── scanner/              # QR attendance scanner (facilitator, admin)
│   │   ├── registrations/        # Registrations dashboard (admin)
│   │   ├── schedules/            # Schedule management (admin)
│   │   ├── users/                # User management with ban/unban (admin)
│   │   ├── payments/             # Payment verification (admin)
│   │   ├── lineups/[scheduleId]/ # Lineup builder (admin)
│   │   ├── locations/            # Location management (admin)
│   │   ├── payment-channels/     # Payment method management (admin)
│   │   ├── logs/                 # Activity/error logs (super_admin)
│   │   ├── mvp/                  # MVP awards (facilitator)
│   │   ├── profile/              # Profile management (all roles)
│   │   ├── register/             # Admin player registration
│   │   └── my-registrations/     # Registration history (all roles)
│   └── api/                      # API routes
├── components/
│   ├── ui/                       # Styled UI primitives
│   └── app-shell.tsx             # Universal nav (role-based)
├── lib/
│   ├── supabase/                 # Client factories (server, browser, service)
│   ├── queries/                  # DB query functions (by table)
│   ├── validations/              # Zod schemas
│   ├── hooks/                    # Custom React hooks
│   └── logger.ts                 # logActivity, logError, logWarn
└── types/
    └── database.ts               # Generated Supabase types

docs/
├── CODEBASE.md                   # Technical reference
├── FUNCTIONAL.md                 # Feature overview
├── SECURITY.md                   # Security architecture
├── TESTING.md                    # Testing strategy
├── STYLE_GUIDE.md                # Design system
├── playwright-guide.md           # E2E testing guide
├── setup/                        # Setup guides
├── architecture/                 # Architecture decisions
└── database/                     # Migration strategy
```

## Authentication Flow

1. User visits any protected route → redirected to `/auth`
2. Signs up or logs in with email + password
3. Middleware checks profile completion → `/create-profile` if not done
4. Redirected to role-based dashboard (`/dashboard`)
5. Banned users → `/auth?error=banned`

## Database Security

- RLS policies enabled on all tables
- Role checked from database on every privileged API call (not from request headers)
- Admin operations use service role client (server-side only)
- Storage bucket private — users access only their own files

## Implementation Status

### Live
- Authentication (email + password)
- Role-based routing and permissions
- Game schedule management
- Player registration (solo, group, team)
- Payment tracking and verification
- Promotions / schedule discounts (percent or fixed)
- QR code attendance scanning
- Registrations dashboard
- Team lineup builder
- User management with ban/unban
- Activity logs
- Waiver flow
- Profile management
- Admin player registration
- MVP awards (nav coming soon)
- E2E test suite (Playwright)

### Coming Soon
- Promotions / discounts
- Announcements
- PWA (installable, push notifications)
- Webhooks

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Project conventions for AI-assisted development |
| [docs/CODEBASE.md](docs/CODEBASE.md) | Technical reference (routes, API, schema, components) |
| [docs/FUNCTIONAL.md](docs/FUNCTIONAL.md) | Feature overview for stakeholders |
| [docs/SECURITY.md](docs/SECURITY.md) | Security architecture and threat model |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy, coverage, and patterns |
| [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) | Design system and component patterns |
| [docs/playwright-guide.md](docs/playwright-guide.md) | E2E testing guide |
| [docs/setup/INITIAL_SETUP.md](docs/setup/INITIAL_SETUP.md) | Full setup guide |

## Contributing

Follow conventions in [CLAUDE.md](CLAUDE.md):
- Use specialized agents for implementation tasks
- Write unit tests for new features (90% coverage threshold)
- Follow the style guide
- Update `docs/CODEBASE.md` and `docs/FUNCTIONAL.md` with new features

---

**Last updated:** 2026-04-06
