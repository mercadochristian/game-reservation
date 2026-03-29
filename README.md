# 🏐 Volleyball Game Reservation System

A full-stack web application for managing volleyball game reservations, player registrations, and administrative operations with role-based access control.

## Features

- **Player Role** — Browse schedules, register for games, upload payment proofs, view registration history
- **Facilitator Role** — Manage game-day operations, track attendance via QR codes, manage team assignments
- **Admin Role** — Manage schedules, review payments, manage locations, view detailed logs

## Tech Stack

- **Frontend** — Next.js 15 + React 19 + TypeScript 5 + Tailwind CSS v4
- **Backend** — Supabase (PostgreSQL) + Auth (magic link, email, OAuth)
- **Forms** — React Hook Form + Zod validation
- **Animations** — Framer Motion v12
- **UI** — Custom shadcn-style components on @base-ui/react primitives

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone and install:**
   ```bash
   git clone <repo>
   cd game-reservation
   npm install
   ```

2. **Setup Supabase** — See [docs/setup/INITIAL_SETUP.md](docs/setup/INITIAL_SETUP.md)

3. **Run dev server:**
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

## Documentation

| Document | Purpose |
|----------|---------|
| [**CLAUDE.md**](CLAUDE.md) | Project instructions & conventions |
| **Setup** | |
| [docs/setup/INITIAL_SETUP.md](docs/setup/INITIAL_SETUP.md) | Complete setup guide (5-15 min) |
| **Development** | |
| [docs/CODEBASE.md](docs/CODEBASE.md) | Technical reference (routes, components, types) |
| [docs/FUNCTIONAL.md](docs/FUNCTIONAL.md) | Feature overview for stakeholders |
| [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) | Design system & component patterns |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy & coverage |
| **Architecture** | |
| [docs/architecture/LINEUP_FEATURE.md](docs/architecture/LINEUP_FEATURE.md) | Volleyball team formation & positions |
| [docs/architecture/REFACTORING.md](docs/architecture/REFACTORING.md) | Planned refactoring work |
| [docs/architecture/PWA.md](docs/architecture/PWA.md) | Progressive Web App strategy |
| **Database** | |
| [docs/database/MIGRATIONS.md](docs/database/MIGRATIONS.md) | Migration strategy |

## Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run test             # Run unit tests
npm run test:watch       # Watch mode for tests
npm run test:coverage    # Generate coverage report
```

## Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── admin/          # Admin dashboard & features
│   ├── player/         # Player dashboard & features
│   ├── facilitator/    # Facilitator dashboard & features
│   ├── auth/           # Authentication pages
│   └── layout.tsx      # Root layout with AppShell
├── components/
│   ├── ui/             # Primitive UI components
│   └── *.tsx           # Shared layout components
├── lib/
│   ├── supabase/       # Client, server, middleware
│   ├── validations/    # Zod schemas
│   ├── errors/         # Error handling
│   └── utils/          # Helper functions
└── types/              # TypeScript definitions

docs/
├── setup/              # Installation & deployment
├── architecture/       # Technical decisions & features
└── database/           # Migrations & schema
```

## Architecture Highlights

### Authentication Flow
1. User visits `/` → redirected to `/auth`
2. Sign up/login via email, magic link, or OAuth
3. `handle_new_user` trigger assigns role based on email whitelist
4. Middleware redirects to role-specific dashboard
5. Session auto-refreshes on every request

### Role-Based Access
- **Admin** — Full platform access, schedule/payment management
- **Facilitator** — Game operations, attendance tracking
- **Player** — Registration, payment, profile management

### Database Security
- RLS policies on all tables
- Admin checks via inline subquery (prevents privilege escalation)
- Storage bucket private (users can only access own files)
- Unique constraints prevent double-booking

## Implementation Status

### ✅ Complete
- Authentication system (email, magic link, OAuth)
- Database schema & migrations
- Role-based routing & permissions
- TypeScript types & validation schemas
- UI primitive components
- Core App Shell & navigation

### 🚀 Next Features (Priority Order)
1. Player registration flow
2. Schedule management (CRUD)
3. Payment processing & verification
4. Team management & shuffling
5. QR code attendance tracking
6. MVP awards system

## Contributing

Follow the patterns established in [CLAUDE.md](CLAUDE.md):
- Use the specialized agents for implementation tasks
- Write unit tests for new features
- Follow style guide conventions
- Update documentation with new features

## Support

- **Questions about setup?** → See [docs/setup/INITIAL_SETUP.md](docs/setup/INITIAL_SETUP.md)
- **Unsure about conventions?** → Check [CLAUDE.md](CLAUDE.md)
- **Need technical details?** → See [docs/CODEBASE.md](docs/CODEBASE.md)

---

**Last updated:** March 2026 | **Status:** Foundation complete, ready for feature development
