# Documentation Index

## 📖 Start Here

- **[README.md](../README.md)** — Project overview and quick start
- **[CLAUDE.md](../CLAUDE.md)** — Development conventions and guidelines

## 🚀 Getting Started

### Setup & Deployment
- **[setup/INITIAL_SETUP.md](setup/INITIAL_SETUP.md)** — Complete setup guide (Supabase, env vars, OAuth)

## 👨‍💻 Development

### Core References
- **[CODEBASE.md](CODEBASE.md)** — Technical deep-dive (routes, components, types, schemas)
- **[FUNCTIONAL.md](FUNCTIONAL.md)** — Feature overview for non-technical stakeholders
- **[STYLE_GUIDE.md](STYLE_GUIDE.md)** — Design system, components, animations, forms, accessibility

### Testing
- **[TESTING.md](TESTING.md)** — Unit testing strategy & coverage plan

## 🏗️ Architecture

### Feature Design
- **[architecture/LINEUP_FEATURE.md](architecture/LINEUP_FEATURE.md)** — Volleyball team formations & position validation
- **[architecture/PWA.md](architecture/PWA.md)** — Progressive Web App strategy
- **[architecture/REFACTORING.md](architecture/REFACTORING.md)** — Planned refactoring work

### Database
- **[database/MIGRATIONS.md](database/MIGRATIONS.md)** — Migration strategy & schema updates

## 📋 Implementation Status

### Completed
- ✅ Foundation (auth, database, TypeScript, UI components)
- ✅ Role-based routing
- ✅ Supabase setup & RLS
- ✅ Design system & style guide

### In Progress
- 🚀 Core features (registration, schedules, payments)
- 🚀 Testing coverage
- 🚀 UI polish & animations

### Planned
- 📌 Team management & shuffling
- 📌 Attendance tracking (QR codes)
- 📌 MVP awards system

## 📁 File Organization

```
docs/
├── INDEX.md                         # This file
├── CODEBASE.md                      # Technical reference
├── FUNCTIONAL.md                    # Stakeholder overview
├── STYLE_GUIDE.md                   # Design system
├── TESTING.md                       # Testing strategy
├── IMPLEMENTATION_SUMMARY.md        # Status report
├── setup/
│   └── INITIAL_SETUP.md            # Setup guide
├── architecture/
│   ├── LINEUP_FEATURE.md           # Team formations
│   ├── PWA.md                      # PWA strategy
│   └── REFACTORING.md              # Refactoring plan
└── database/
    └── MIGRATIONS.md                # Migration guide
```

## 🔍 Quick Lookups

### "How do I...?"
- **Set up the app locally?** → [setup/INITIAL_SETUP.md](setup/INITIAL_SETUP.md)
- **Add a new page/route?** → [CODEBASE.md](CODEBASE.md#add-a-new-page)
- **Create a form?** → [STYLE_GUIDE.md](STYLE_GUIDE.md#form-patterns--error-states)
- **Add a nav item?** → [CODEBASE.md](CODEBASE.md#add-a-new-nav-item)
- **Style a component?** → [STYLE_GUIDE.md](STYLE_GUIDE.md)
- **Write a test?** → [TESTING.md](TESTING.md)

### "Tell me about..."
- **Authentication flow** → [CODEBASE.md](CODEBASE.md#route-guard--auth-flow)
- **Database schema** → [CODEBASE.md](CODEBASE.md#database--types)
- **Validation schemas** → [CODEBASE.md](CODEBASE.md#validation-schemas)
- **Component library** → [STYLE_GUIDE.md](STYLE_GUIDE.md#component-inventory--phased-roadmap)
- **Volleyball positions & lineups** → [architecture/LINEUP_FEATURE.md](architecture/LINEUP_FEATURE.md)
- **Role-based features** → [FUNCTIONAL.md](FUNCTIONAL.md)

---

**Last updated:** March 2026
