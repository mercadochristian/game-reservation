# Volleyball Game Reservation System

## Project Overview

A full-stack web application for managing volleyball game reservations, player registrations, and administrative operations. The system supports three user roles:
- **Admin**: Manage schedules, locations, player registrations, and payment verification
- **Facilitator**: Manage game-day operations, attendance tracking via QR codes, and team management
- **Player**: Register for games, view upcoming matches, and manage profile information

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (app router) with React 19 and TypeScript 5
- **Styling**: Tailwind CSS v4 with dark mode support via `@custom-variant dark (&:is(.dark *))`
- **UI Components**: Custom shadcn-style primitives in `src/components/ui/`, built on `@base-ui/react`
- **Animation**: Framer Motion v12 (`import { motion, AnimatePresence } from 'framer-motion'`)
- **Forms**: React Hook Form + Zod validation via `@hookform/resolvers/zod`
- **Icons**: Lucide React
- **Notifications**: Sonner toast library (`import { toast } from 'sonner'`)

### Backend & Auth
- **Backend**: Supabase (PostgreSQL + Auth)
- **Auth**: Magic link sign-in via `@supabase/ssr` middleware
- **Client**: `createClient()` from `@/lib/supabase/client` (browser) or `createServiceClient()` from `@/lib/supabase/service.ts` (server)

## Dev Commands

```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### File Structure
- `src/app/` — Next.js pages and layouts organized by role
  - `admin/`, `player/`, `facilitator/` — role-based entry points
  - `auth/` — magic link sign-in
  - `create-profile/` — onboarding form
  - `api/profile/complete/` — POST endpoint for profile submission
- `src/components/` — React components
  - `app-shell.tsx` — Universal navigation shell for all roles
  - `ui/` — Primitives (Button, Dialog, Input, Label, Badge, Table, etc.)
- `src/lib/` — Utilities and config
  - `supabase/` — Client/server Supabase instances
  - `config/branding.ts` — Loads `branding.json` at root
  - `validations/` — Zod schemas (location, auth, profile)
- `src/types/index.ts` — Re-exports database types from Supabase

### Route Guard & Auth Flow
1. Unauthenticated → redirected to `/auth` (magic link sign-in)
2. Authenticated + no profile → redirected to `/create-profile` (players only)
3. Authenticated + profile complete → redirected to role dashboard (`/admin`, `/facilitator`, `/player`)

The middleware (`src/middleware.ts`) enforces role-based redirects via `users.role` and `users.profile_completed`.

### Navigation & Layouts
All role dashboards wrap the `AppShell` component (`src/components/app-shell.tsx`):

**Mobile (< 1024px):**
- Fixed top bar (height 64px) with hamburger menu on the left
- Hamburger opens a slide-out drawer from the left with nav items
- Main content has top padding only (`pt-16`)

**Desktop (>= 1024px):**
- Fixed left sidebar (width 256px)
- Main content left margin (`ml-64`)

Nav items are defined per role and include "coming soon" items (opacity-faded, non-clickable).

## Conventions

### Light Mode
The application uses light mode by default. Remove any forced `.dark` class to allow system/browser preferences to apply.

### Animation Pattern
Use Framer Motion with a `fadeUpVariants` object for consistent staggered animations:
```ts
const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.1 },
  }),
}
```

Apply with `<motion.div custom={index} initial="hidden" animate="visible" variants={fadeUpVariants}>`. The `custom` prop controls stagger delay.

### Readability
All labels and icons must be readable at all times. Use sufficient contrast, always pair icons with text labels or accessible tooltips, and never rely on color alone to convey meaning.

### Actionable Elements
Always add `cursor-pointer` to elements with hover effects (buttons, clickable cards, radio options, etc.). Example:
```jsx
<div
  onClick={() => setPosition(option.value)}
  className="p-3 cursor-pointer transition-colors hover:bg-muted"
>
  {/* content */}
</div>
```
This ensures clear visual feedback that an element is interactive.

### Button Sizes
- `default` — standard height
- `sm` — smaller height
- `xs` — extra small
- `icon`, `icon-sm`, `icon-lg` — square buttons for icons

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`

### Forms
Use React Hook Form + Zod:
```tsx
const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
  resolver: zodResolver(mySchema),
  defaultValues: { /* ... */ },
})
```

### Toasts
```ts
import { toast } from 'sonner'

toast.success('Operation successful')
toast.error('Operation failed')
```

### Client Components
Add `'use client'` directive to any component using React hooks (useState, useEffect, useContext) or interactive events. The `AppShell` is a client component; layouts that wrap it don't need the directive.

## Development Principles

### Do Not Assume — Always Ask
When requirements are ambiguous, edge cases are unclear, or implementation direction is uncertain, **always ask a clarifying question** before proceeding. Better to pause for 30 seconds than to build the wrong thing. Questions are encouraged and expected.

## Branding
Branding config is loaded from `branding.json` at the project root via `src/lib/config/branding.ts`. The typed config object includes:
- `name` — organization name
- `tagline` — short description
- `logo` — { url, altText }
- `colors` — { primary, secondary, ... }

Update `branding.json` to customize the app's appearance.

## Database & Types
Generated types from Supabase are in `src/types/database.ts`. Re-export commonly used types from `src/types/index.ts`:
```ts
export type Location = Database['public']['Tables']['locations']['Row']
export type User = Database['public']['Tables']['users']['Row']
// etc.
```

## Key Dependencies
- `next@15`, `react@19`, `typescript@5`
- `@base-ui/react@1.3.0` — headless UI primitives
- `framer-motion@12.36.0` — animations
- `react-hook-form@7.71.2`, `zod@4.3.6` — forms & validation
- `@supabase/ssr@0.9.0`, `@supabase/supabase-js@2.99.1` — backend
- `sonner@2.0.7` — toasts
- `tailwindcss@4.2.1` — styling

## Common Tasks

### Add a new page/route
1. Create folder under `src/app/{role}/{feature}/`
2. Create `page.tsx` as a client component with `'use client'` if it uses hooks
3. The role layout will automatically wrap it with `AppShell`

### Add a new nav item
Edit the `NAV_ITEMS` object in `src/components/app-shell.tsx`:
```ts
const NAV_ITEMS: Record<Role, Array<{ label, href, icon, active }>> = {
  admin: [
    { label: 'Your Feature', href: '/admin/your-feature', icon: YourIcon, active: true },
    // ...
  ],
}
```

### Create a form with validation
1. Define a Zod schema in `src/lib/validations/your-schema.ts`
2. Use React Hook Form with `zodResolver(yourSchema)`
3. Import UI components and apply error styling
4. Call a Supabase client method in `handleSubmit`

### Style a new component
Use Tailwind utility classes. Dark mode is always active on authenticated pages. Reference existing components in `src/components/` for patterns (spacing, colors, interactive states).

## Agent-Assisted Development

Always use the appropriate specialized agent for complex tasks. These agents understand your codebase and best practices:

### **nextjs-supabase-architect**
Use for: implementing features, refactoring code, fixing bugs, creating API routes, database queries, auth flows
- Best for: Full-stack features, architectural decisions, data layer changes
- Example: "Add user registration flow" → Architecture, validation, API route, database

### **frontend-ui-crafter**
Use for: Building new pages, designing components, improving UI/UX, styling, animations, responsive design
- Best for: New pages, component redesigns, visual improvements, accessibility fixes
- Example: "Create a game schedule card component" → Component design, Tailwind styling, animations

### **senior-code-reviewer**
Use for: Code quality assessment, performance optimization, refactoring recommendations, pattern consistency
- Best for: After significant code changes, performance concerns, design pattern reviews
- Example: "Review this API route for security and efficiency" → Security audit, optimization suggestions

### **Explore** (subagent)
Use for: Understanding codebase structure, finding patterns, analyzing code quality, identifying improvement opportunities
- Best for: Research tasks, codebase analysis, comprehensive code review prep
- Example: "Find all places where we're not using error handling" → Systematic search and analysis

### **Plan** (subagent)
Use for: Designing implementation approaches, breaking down complex tasks, architectural planning
- Best for: Large features, significant refactors, before coding implementation details
- Example: "Plan the payment verification workflow" → Design, flow diagram, step-by-step approach

### **unit-test-engineer**
Use for: Writing tests, test coverage, ensuring code reliability
- Best for: After implementing features, before marking complete, regression testing
- Example: "Write tests for the new registration form" → Unit tests, integration tests, coverage

### When to Use Each Agent

| Task | Agent | Why |
|------|-------|-----|
| Add new feature | `nextjs-supabase-architect` | Understands full-stack implementation patterns |
| Fix styling bug | `frontend-ui-crafter` | Expert in Tailwind, animations, responsive design |
| Improve performance | `senior-code-reviewer` | Identifies inefficiencies and optimizations |
| Understand codebase | `Explore` | Systematic pattern discovery |
| Plan complex feature | `Plan` | Architectural expertise before coding |
| Add unit tests | `unit-test-engineer` | Test coverage and best practices |
| Analyze code quality | `Explore` → `senior-code-reviewer` | Discover issues, then review improvements |

**Rule: For any non-trivial task (more than a few lines or multiple files), use an agent rather than doing it manually.** This ensures consistency, best practices, and catches edge cases you might miss.

## Documentation & Feature Tracking

The codebase has two key reference documents in `/docs/`:

### `docs/CODEBASE.md` — Developer Reference
Technical deep-dive: database schema, API routes, pages, components, validation schemas, code patterns. This is the go-to resource when implementing features or debugging.

### `docs/FUNCTIONAL.md` — Stakeholder Reference
High-level, plain-language overview of features, user roles, and workflows. For non-technical stakeholders to understand what the system does.

### When You Implement a New Feature
1. **Add to both docs** — update the relevant section in `CODEBASE.md` (technical details) and `FUNCTIONAL.md` (plain language description)
2. **Update Feature Log** — add a row to the "Feature Log" table at the end of both docs with: date, feature name, files changed (for CODEBASE.md) or description (for FUNCTIONAL.md)
3. **Keep docs in sync** — the docs are the single source of truth for understanding the system; keep them up-to-date as the codebase evolves

This ensures future developers and stakeholders have a current understanding of what exists and how it works.
