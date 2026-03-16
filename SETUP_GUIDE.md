# Volleyball Reservation App — Setup Guide

## ✅ What's Already Done

The foundation is complete:
- ✅ Next.js 14 project structure with TypeScript & Tailwind CSS
- ✅ 5 SQL migration files (enums → tables → triggers → RLS → storage)
- ✅ Supabase client setup (@supabase/ssr) with session refresh
- ✅ Auth flow (login page + OAuth callback + middleware)
- ✅ TypeScript types matching the DB schema
- ✅ Dashboard placeholders for all 3 roles (admin, facilitator, player)
- ✅ UI components (Card, Input, Button, Tabs, Label)

## 🚀 Next Steps to Get Running

### 1. Create Supabase Projects

Create two Supabase projects (one for staging, one for prod):
- Go to [supabase.com](https://supabase.com)
- Create project `volleyball-staging` (use same region as production)
- Create project `volleyball-prod`

### 2. Run Migrations

For **staging**:
1. In Supabase dashboard → SQL Editor
2. Copy & paste the contents of:
   - `supabase/migrations/20240101000000_create_enums.sql`
   - `supabase/migrations/20240101000001_create_tables.sql`
   - `supabase/migrations/20240101000002_create_triggers.sql`
   - `supabase/migrations/20240101000003_create_rls_policies.sql`
   - `supabase/migrations/20240101000004_create_storage.sql`
3. Run each migration in order

Repeat for **prod**.

### 3. Set Environment Variables

Create `.env.local` with staging credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Find these in: Supabase Dashboard → Settings → API

### 4. Configure OAuth (Google)

1. Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. In URL Configuration → Redirect URLs, add:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://your-production-domain/auth/callback` (prod)

### 5. Seed Role Whitelist (Optional)

To create admin/facilitator accounts, insert into `role_whitelist`:

```sql
INSERT INTO public.role_whitelist (email, role) VALUES
  ('admin@example.com', 'admin'),
  ('facilitator@example.com', 'facilitator');
```

Any other signup will default to `player`.

### 6. Run Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000`:
- You'll be redirected to `/auth`
- Sign up with email + password, magic link, or Google OAuth
- After login, redirected to your role dashboard
  - New users → `/player`
  - Whitelisted admins → `/admin`
  - Whitelisted facilitators → `/facilitator`

## 📋 File Structure Overview

```
src/
├── app/
│   ├── auth/
│   │   ├── page.tsx          # Login page (2 tabs + OAuth)
│   │   └── callback/route.ts # OAuth & magic link callback
│   ├── admin/page.tsx         # Admin dashboard (placeholder)
│   ├── player/page.tsx        # Player dashboard (placeholder)
│   ├── facilitator/page.tsx   # Facilitator dashboard (placeholder)
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Redirects to /auth
│   └── globals.css
├── components/ui/             # shadcn/ui components
│   ├── card.tsx
│   ├── input.tsx
│   ├── button.tsx
│   ├── tabs.tsx
│   └── label.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Session refresh
│   └── validations/
│       └── auth.ts            # Zod schemas
├── types/
│   ├── database.ts            # Full DB schema type
│   └── index.ts               # Ergonomic type aliases
└── middleware.ts              # Route protection & role redirects

supabase/migrations/
├── 20240101000000_create_enums.sql
├── 20240101000001_create_tables.sql
├── 20240101000002_create_triggers.sql
├── 20240101000003_create_rls_policies.sql
└── 20240101000004_create_storage.sql
```

## 🔐 Key Security Features

✅ RLS on all tables (admins via inline subquery checks)
✅ Storage bucket scoped to user ID paths
✅ Session refresh on every protected request
✅ PKCE OAuth flow
✅ Unique constraints on registrations (no double-booking)
✅ Trigger-based role assignment from whitelist

## 🧪 Testing the Auth Flow

### Test 1: Email + Password
1. Go to `/auth`
2. Sign up with `test@example.com` / `password123`
3. Should create user with role = `player`
4. Redirect to `/player`

### Test 2: Magic Link
1. Go to `/auth`, switch to "Magic Link" tab
2. Enter `test2@example.com`
3. Check email for link
4. Click link → redirects to `/auth/callback` → redirects to `/player`

### Test 3: Google OAuth
1. Go to `/auth`
2. Click "Continue with Google"
3. Should redirect through Google → `/auth/callback` → `/player`

### Test 4: Admin Redirect
1. Add your email to `role_whitelist` with role = `admin`
2. Sign up / log in with that email
3. Should redirect to `/admin`

## 🛠️ Common Issues

**Q: "Cannot find module '@radix-ui/react-tabs'"**
→ Run `npm install @radix-ui/react-tabs`

**Q: "NEXT_PUBLIC_SUPABASE_URL is required"**
→ Check `.env.local` — make sure both keys are set

**Q: "OAuth redirect URL mismatch"**
→ Add redirect URL in Supabase Dashboard → Auth → URL Configuration

**Q: "User created but role is undefined"**
→ Check `handle_new_user` trigger fired (look at `public.users` table)

## 📚 Next Features to Build

1. **Registration Flow** (`/player/register`)
   - List open schedules
   - Validate skill level
   - Create registration record
   - Set team preference

2. **Schedule Management** (`/admin/schedules`)
   - CRUD schedules
   - View registrations per schedule
   - Shuffle teams

3. **Payment Upload** (`/player/payment`)
   - Upload screenshot to Storage
   - Link to registration record
   - Trigger email notification

4. **Payment Review** (`/admin/payments`)
   - View all pending payment proofs
   - Approve/reject with reason
   - Notify player

5. **QR Scanner** (`/facilitator/scanner`)
   - Real-time camera feed
   - Scan registration QR tokens
   - Mark attendance

## 📞 Questions?

Refer to:
- Plan: `/claude/plans/giggly-dreaming-widget.md`
- Memory: `/claude/projects/.../memory/project_overview.md`
- Plan contains implementation details and critical design decisions
