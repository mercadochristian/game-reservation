# Style Guide — Volleyball Reservation System

> **Living document.** Update this file when design decisions change or new patterns are established.
> Use `- [x]` for completed items and `- [ ]` for pending todos in the phase checklists.

---

## Table of Contents

1. [Color Tokens](#1-color-tokens)
2. [Typography Scale](#2-typography-scale)
3. [Spacing Scale](#3-spacing-scale)
4. [Breakpoints & Responsive Strategy](#4-breakpoints--responsive-strategy)
5. [Animation Standards](#5-animation-standards)
6. [Dark Mode Strategy](#6-dark-mode-strategy)
7. [Form Patterns & Error States](#7-form-patterns--error-states)
8. [Button Guidelines](#8-button-guidelines)
9. [Icon Guidelines](#9-icon-guidelines)
10. [Accessibility Standards](#10-accessibility-standards)
11. [Component Inventory & Phased Roadmap](#11-component-inventory--phased-roadmap)
12. [Known Issues Log](#12-known-issues-log)

---

## 1. Color Tokens

All colors are defined as CSS custom properties in `src/app/globals.css` and exposed as Tailwind utilities via `@theme inline`. **Never use raw hex values or hardcoded color classes (e.g. `text-blue-600`) in page files.** Always use semantic token utilities.

### Light Mode Tokens (`:root`)

| CSS Variable | Tailwind Utility | OKLCH Value | Use For |
|---|---|---|---|
| `--background` | `bg-background` | `oklch(1 0 0)` — pure white | Page/app background |
| `--foreground` | `text-foreground` | `oklch(0.145 0 0)` — near black | Body text, headings |
| `--card` | `bg-card` | `oklch(1 0 0)` | Card surfaces, sidebar, dialog backgrounds |
| `--card-foreground` | `text-card-foreground` | `oklch(0.145 0 0)` | Text on card surfaces |
| `--muted` | `bg-muted` | `oklch(0.97 0 0)` — very light gray | Table row hover, secondary backgrounds, input bg |
| `--muted-foreground` | `text-muted-foreground` | `oklch(0.556 0 0)` — medium gray | Descriptions, labels, placeholder text, breadcrumb |
| `--primary` | `bg-primary` | `oklch(0.205 0 0)` — near black | Primary CTA button background |
| `--primary-foreground` | `text-primary-foreground` | `oklch(0.985 0 0)` — near white | Text on primary buttons |
| `--secondary` | `bg-secondary` | `oklch(0.97 0 0)` | Secondary button backgrounds (same as muted in light) |
| `--secondary-foreground` | `text-secondary-foreground` | `oklch(0.205 0 0)` | Text on secondary buttons |
| `--accent` | `bg-accent` | `oklch(0.97 0 0)` | Active nav item background |
| `--accent-foreground` | `text-accent-foreground` | `oklch(0.205 0 0)` | Text on active nav items |
| `--destructive` | `bg-destructive`, `text-destructive` | `oklch(0.577 0.245 27.325)` — red | Error states, delete actions |
| `--border` | `border-border` | `oklch(0.922 0 0)` — light gray | All dividers and outlines |
| `--input` | `border-input` | `oklch(0.922 0 0)` | Input borders (same as border in light) |
| `--ring` | `ring-ring` | `oklch(0.708 0 0)` | Focus rings on all interactive elements |
| `--sidebar` | `bg-sidebar` | `oklch(0.985 0 0)` | App sidebar background (slightly off-white) |
| `--radius` | — | `0.625rem` | Base border radius; used as `rounded-lg` |

### Brand Token (to be added — Phase 1)

| CSS Variable | Tailwind Utility | Use For |
|---|---|---|
| `--brand-primary` | `bg-brand-primary` | Branding accents: section number circles, auth submit button |
| `--brand-primary-foreground` | `text-brand-primary-foreground` | Text on brand-primary backgrounds |

> **Why a separate brand token?** The `--primary` token is the app's design system primary (dark near-black in light mode, blue in dark mode). The brand color from `branding.json` is a fixed blue (`#3b82f6`) that does not shift with light/dark mode. These are different concerns and must not be merged.

### Rules

- `bg-background` for page backgrounds; `bg-card` for elevated surfaces (cards, sidebar, dialogs)
- `text-foreground` for primary text; `text-muted-foreground` for secondary/helper text
- `border-border` for all borders; `border-input` specifically for form element borders
- `bg-primary` / `text-primary-foreground` only for the primary CTA button
- `bg-accent` / `text-accent-foreground` for active/selected states in navigation
- `text-destructive` and `bg-destructive/10` for errors and warnings
- `bg-muted/50` for subtle hover states (table rows, cards)
- **Never use** `dark:text-blue-600`, `dark:text-yellow-400`, or any hardcoded color in page files

---

## 2. Typography Scale

All headings globally receive `font-weight: 700` and `letter-spacing: -0.01em` via `globals.css`. Do not override heading weight with `font-semibold` — use `font-bold` consistently at the heading level.

| Use Case | Tailwind Classes | Example Usage |
|---|---|---|
| **Page title (H1)** | `text-3xl lg:text-4xl font-bold text-foreground` | "Schedules", "Admin Dashboard" |
| **Section header (H2)** | `text-lg font-semibold text-foreground` | "Games This Week", "Filter Results" |
| **Card title** | `text-xl font-semibold text-foreground` | Dashboard navigation cards |
| **Dialog title** | `text-lg font-semibold text-foreground` | Dialog headings via `DialogTitle` |
| **Body text** | `text-sm text-foreground` | Table cells, form content, list items |
| **Page subtitle/description** | `text-muted-foreground` (inherits `text-sm`) | Subtitle below every page H1 |
| **Form label** | `text-sm font-medium` via `<Label>` | All form field labels |
| **Compact label** | `text-xs font-medium` | Filter labels, tight form layouts |
| **Caption / metadata** | `text-xs text-muted-foreground` | Timestamps, record IDs, secondary counts |
| **Monospace** | `text-sm font-mono` | Log action codes, system IDs |
| **Error text** | `text-xs text-destructive` | Field-level validation errors |
| **Badge text** | `text-xs font-medium` (set by Badge primitive) | Status labels, count indicators |

### Rules

- Page titles always scale: `text-3xl lg:text-4xl` (smaller on mobile, larger on desktop)
- Every page H1 must be followed by a description line in `text-muted-foreground`
- Do not mix `font-semibold` and `font-bold` at the same hierarchy level
- `text-xs` is the floor — never go smaller

---

## 3. Spacing Scale

### Page Containers

| Context | Classes |
|---|---|
| Feature pages (admin, player, facilitator sub-pages) | `max-w-6xl mx-auto p-6 lg:p-8` |
| Dashboard pages | `max-w-4xl mx-auto p-8` |
| Auth / onboarding standalone pages | `max-w-lg mx-auto px-4 py-8` |
| Register flow (no AppShell) | `max-w-lg mx-auto px-4 py-8` |
| Public calendar page | `pt-20 px-4 sm:px-6 max-w-4xl mx-auto` (pt-20 for fixed public nav) |

### Internal Spacing

| Context | Classes |
|---|---|
| After page header (H1 + description block) | `mb-8` |
| Between major page sections | `mb-6` |
| Card inner padding (standard) | `p-6` |
| Card inner padding (compact) | `p-4` |
| Dialog inner padding | `p-4` (set by Dialog primitive, do not override) |
| Between form groups (label + input pairs) | `space-y-4` |
| Within a form group (label to input gap) | `space-y-2` |
| Between filter fields within FilterAccordion | `gap-3` |
| Between icon-only buttons in a group | `gap-1` |
| Between labeled buttons in a group | `gap-2` |
| Table cell primary content | `py-4` |
| Section breadcrumb to page header | `mb-6` (breadcrumb is `mb-6`, header follows) |

### Grid Patterns

| Layout | Classes |
|---|---|
| Admin dashboard (4 cards) | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` |
| Player / Facilitator dashboard (3 cards) | `grid grid-cols-1 md:grid-cols-3 gap-6` |
| Schedule selector grid | `grid grid-cols-1 md:grid-cols-2 gap-4` |
| Two-column form fields | `grid grid-cols-2 gap-4` |

---

## 4. Breakpoints & Responsive Strategy

**Mobile-first:** All base styles target 375px (compact mobile). Use breakpoint prefixes to progressively enhance for larger screens.

### Tailwind Breakpoints (v4 defaults)

| Prefix | Min-width | Primary use in this app |
|---|---|---|
| _(none)_ | 0px / 375px | Mobile base styles |
| `sm:` | 640px | Show secondary table columns, stack → row layouts |
| `md:` | 768px | Multi-column grids, show tertiary table columns |
| `lg:` | 1024px | **AppShell sidebar appears** (key breakpoint); larger type, more padding |
| `xl:` | 1280px | Rarely used — contained by `max-w-6xl` |

### Established Patterns

**Navigation layout:**
- `< lg`: Fixed top bar (h-16) + slide-out drawer from left
- `>= lg`: Fixed left sidebar (w-64 = 256px); main content has `lg:ml-64`

**Action buttons in page headers:**
```tsx
// Stack on mobile, inline on sm+
<Button className="w-full sm:w-auto">New Schedule</Button>
```

**Page header row (title + action):**
```tsx
<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
```

**Table responsive column hiding:**
```tsx
<TableHead className="hidden sm:table-cell">Location</TableHead>   // shows at 640px+
<TableHead className="hidden md:table-cell">Created</TableHead>     // shows at 768px+
```

**Typography responsive scaling:**
```tsx
<h1 className="text-3xl lg:text-4xl font-bold">Schedules</h1>
```

**Container padding responsive:**
```tsx
<div className="max-w-6xl mx-auto p-6 lg:p-8">
```

---

## 5. Animation Standards

Animation utilities live in `src/lib/animations.ts`. **Do not define animation variants inline in page files** — import from this file. If a new variant is needed, add it to `animations.ts` and document it here.

### Available Variants

| Variant | Import | Use For | Supports Stagger |
|---|---|---|---|
| `fadeUpVariants` | `import { fadeUpVariants } from '@/lib/animations'` | Page sections, cards, table containers entering the page | Yes (`custom={n}`) |
| `fadeInVariants` | `import { fadeInVariants } from '@/lib/animations'` | Overlays, full-screen transitions, elements with no vertical travel | Yes (`custom={n}`) |
| `slideInVariants` | `import { slideInVariants } from '@/lib/animations'` | Drawers, side panels sliding from left | Yes (`custom={n}`) |

> **Note:** `slideInVariants` has a bug where `visible` sets `opacity: 0` instead of `opacity: 1`. **Do not use `slideInVariants` until Phase 1 is complete.**

### Stagger Convention

The `custom` prop controls stagger delay: `delay = custom * 0.1s`.

```tsx
// First element — no delay
<motion.div custom={0} initial="hidden" animate="visible" variants={fadeUpVariants}>

// Second element — 100ms delay
<motion.div custom={1} initial="hidden" animate="visible" variants={fadeUpVariants}>
```

- `custom={0}` through `custom={5}` are the valid range (0ms to 500ms)
- **Do not exceed `custom={5}`** — delays beyond 500ms feel sluggish
- On page load, stagger page sections: header = `custom={0}`, filter = `custom={1}`, table = `custom={2}`, pagination = `custom={3}`

### Page Header Animation (Special Case)

The page title block uses a slightly different inline animation — this is intentional and established:

```tsx
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* page title, description, action button */}
</motion.div>
```

This is a downward-entering animation (`y: -10`) distinct from the upward-entering `fadeUpVariants`. The `PageHeader` component (Phase 3) will bake this in — **do not replicate inline in new pages**.

### Filter Accordion Animation

The collapsible filter panel uses height-based animation:

```tsx
<AnimatePresence>
  {open && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* filter fields */}
    </motion.div>
  )}
</AnimatePresence>
```

The `FilterAccordion` component (Phase 3) will standardize this — **do not replicate inline in new pages**.

### What NOT to Animate

| Element | Reason |
|---|---|
| Inline form validation error messages | Must appear instantly on field blur/submit |
| Pagination controls | These are purely functional; animation adds friction |
| Dialog content | The Dialog primitive handles its own enter/exit animation |
| Loading skeleton rows | Pulse animation is CSS-driven via `animate-pulse`, not Framer Motion |
| Table row hover states | CSS `transition-colors` only |

---

## 6. Dark Mode Strategy

### Decision: System Preference (Not Forced)

**Remove the forced `dark` class from `src/app/layout.tsx`.** The CLAUDE.md specifies light mode as default with system-preference-based dark mode. The current forced `className="dark"` on `<html>` means every user sees dark mode regardless of system preference — this is a bug.

**How it works after the fix:**
- The `@custom-variant dark (&:is(.dark *))` in `globals.css` activates dark tokens when `.dark` is present on any ancestor
- A JavaScript snippet or Next.js theming solution can add `.dark` to `<html>` based on `prefers-color-scheme: dark`
- The dark token set in `globals.css` (blue-tinted OKLCH palette) is well-designed and correct as-is

### Rules for dark: Utilities

`dark:` utilities are **only allowed inside UI primitive files** (`src/components/ui/`). Page files and shared component files must use semantic tokens that automatically adapt.

**Allowed `dark:` usage (primitives only):**
```css
dark:bg-input/30          /* Input background in dark mode */
dark:disabled:bg-input/80 /* Input disabled state */
dark:aria-invalid:border-destructive/50  /* Error state in dark */
```

**Never use in page files:**
```tsx
// WRONG — hardcoded color with dark variant
className="text-blue-600 dark:text-blue-400"

// CORRECT — semantic token adapts automatically
className="text-primary"
```

---

## 7. Form Patterns & Error States

### Standard Field Pattern

Use this exact structure for every form field. No variation.

```tsx
<div>
  <Label htmlFor="field-id">Field Label *</Label>
  <Input
    id="field-id"
    placeholder="Placeholder text"
    aria-invalid={!!errors.field}
    {...register('field')}
  />
  {errors.field && (
    <p className="text-xs text-destructive mt-1">{errors.field.message}</p>
  )}
</div>
```

### Standard Select Field Pattern

```tsx
<div>
  <Label htmlFor="select-id">Select Label</Label>
  <Select
    id="select-id"
    aria-invalid={!!errors.field}
    {...register('field')}
  >
    <option value="">Choose...</option>
    <option value="a">Option A</option>
  </Select>
  {errors.field && (
    <p className="text-xs text-destructive mt-1">{errors.field.message}</p>
  )}
</div>
```

### Rules

| Rule | Detail |
|---|---|
| Always use `aria-invalid={!!errors.field}` | The Input/Select primitives handle visual error styling via CSS `aria-invalid` selector. Never use `className={errors.field ? 'border-destructive' : ''}` |
| Always pair `<Label htmlFor>` with `id` | Required for accessibility — screen readers link the label to the input |
| Error message class is fixed | Always `text-xs text-destructive mt-1` — no variation |
| Required field indicator | Add ` *` to the Label text for required fields |
| Helper text (non-error) | `text-xs text-muted-foreground mt-1` |
| Form group spacing | `space-y-4` between groups, `space-y-2` within a group (label → input) |
| Always use React Hook Form | `useForm` with `zodResolver`. No manual `useState` form fields (the auth page is the current exception, fixed in Phase 4) |
| Zod schemas live in `src/lib/validations/` | One file per domain: `auth.ts`, `location.ts`, `profile.ts`, etc. |

### Custom Input Types (Skill Level Cards, Gender Chips)

For custom radio-style inputs that aren't `<input>` elements, show errors directly:
```tsx
{errors.skillLevel && (
  <p className="text-xs text-destructive mt-2">{errors.skillLevel.message}</p>
)}
```

---

## 8. Button Guidelines

### Variants

| Variant | Use For | Do NOT Use For |
|---|---|---|
| `default` | Primary CTA, form submit, dialog confirm action | Secondary or low-emphasis actions |
| `outline` | Secondary actions, Cancel buttons, pagination Prev/Next | Primary CTA |
| `ghost` | Icon-only actions, nav hover states, low-emphasis inline actions | Primary CTA |
| `destructive` | The confirm button inside delete confirmation dialogs only | First-click destructive triggers |
| `secondary` | Second-level actions (e.g., "Deselect All") | Primary CTA |
| `link` | Inline text navigation links | Buttons with click handlers |

### Sizes

| Size | Height | Use For |
|---|---|---|
| `default` | h-8 | Standard buttons in page headers, dialogs |
| `sm` | h-7 | Buttons in compact spaces (filter clear, table row actions with text) |
| `xs` | h-6 | Very compact inline buttons |
| `icon` | 32×32 | Square icon-only buttons in standard contexts |
| `icon-sm` | 28×28 | Square icon-only buttons in table action columns |
| `icon-lg` | 36×36 | Prominent icon-only buttons |

### Rules

```tsx
// Always add gap-2 when button has both icon and text
<Button className="gap-2">
  <Plus size={18} />
  New Schedule
</Button>

// Icon-only buttons always have title for tooltip
<Button variant="ghost" size="icon-sm" title="Edit location">
  <Pencil size={16} />
</Button>

// Destructive actions always use a confirmation dialog — never trigger directly
<Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
  Delete
</Button>

// Cancel buttons in dialogs are always outline + type="button"
<Button variant="outline" type="button" onClick={onClose}>
  Cancel
</Button>
```

---

## 9. Icon Guidelines

### Source

**Lucide React only.** No other icon libraries. No emoji as icons.

```tsx
import { CalendarDays, Users, MapPin } from 'lucide-react'
```

### Standard Sizes

| Context | Size |
|---|---|
| AppShell navigation icons | `size={20}` |
| Button icons (default/sm button) | `size={18}` |
| Button icons (xs button / tight) | `size={16}` |
| EmptyState illustrations | `size={48}` |
| Page title decorative icon | `size={24}` |
| Badge or inline text icon | `size={14}` |

### Always Pair Icons with Labels

```tsx
// Visible label
<Button className="gap-2">
  <Plus size={18} />
  Add Location
</Button>

// title attribute for icon-only buttons (tooltip on hover)
<Button variant="ghost" size="icon-sm" title="Delete schedule">
  <Trash2 size={16} />
</Button>

// sr-only for screen readers when no visible text
<span className="sr-only">Open menu</span>
```

### Emoji → Lucide Replacement Map

Current dashboard pages use emoji. Replace with Lucide icons when `DashboardCard` is adopted (Phase 3/4).

| Emoji | Context | Lucide Icon |
|---|---|---|
| 📅 | Schedule Management | `CalendarDays` |
| 👥 | Registrations / Team Management | `Users` |
| 💰 | Payments | `CreditCard` |
| 📍 | Locations | `MapPin` |
| 📋 | Register for Game | `ClipboardList` |
| 📊 | My Registrations | `ListChecks` |
| ⭐ | Award MVP | `Star` |
| 📱 | QR Scanner | `QrCode` |
| 🏐 | Volleyball / Game | `Trophy` |

---

## 10. Accessibility Standards

| Rule | Implementation |
|---|---|
| Interactive `div` or custom click targets | Always add `cursor-pointer` |
| Icon-only buttons | Add `title="Action"` on the `<button>` element |
| Form inputs | Pair `<Label htmlFor="x">` with `<Input id="x">` |
| Error states | Use `aria-invalid={!!errors.field}` — not just visual color |
| Coming-soon nav items | `cursor-not-allowed` + `opacity-40` + remove `<Link>` wrapper |
| Destructive icon buttons | `title="Delete [specific item name]"` — not just "Delete" |
| Select elements without visible label | Add `aria-label="Select page size"` |
| Page-level focus management | When a dialog opens, focus moves to dialog content automatically via Base UI Dialog |
| Color contrast | Never rely on color alone — always pair with text, icon, or pattern |
| Loading states | Use `animate-pulse` skeleton, not spinner alone — skeleton communicates structure |

---

## 11. Component Inventory & Phased Roadmap

### Existing Primitives (`src/components/ui/`) ✅

All primitives below are built on `@base-ui/react` and considered stable. Reference them when building new features — do not re-implement their functionality.

| Component | File | Notes |
|---|---|---|
| `Button` | `button.tsx` | All variants and sizes ready |
| `Card`, `CardHeader`, `CardTitle`, etc. | `card.tsx` | `size="sm"` variant available |
| `Input` | `input.tsx` | `aria-invalid` supported natively |
| `Badge` | `badge.tsx` | 6 variants; h-5 pill shape |
| `Dialog` | `dialog.tsx` | `showCloseButton` prop on content/footer |
| `Table`, `TableRow`, etc. | `table.tsx` | Semantic table; rows have hover state |
| `Tabs` | `tabs.tsx` | `default` and `line` variants |
| `Alert` | `alert.tsx` | `default` and `destructive` variants |
| `Label` | `label.tsx` | ⚠️ Uses `@radix-ui/react-label` — fix in Phase 1 |
| `DropdownMenu` | `dropdown-menu.tsx` | Full menu system; not yet used in pages |
| `NavigationMenu` | `navigation-menu.tsx` | Unused pre-built primitive |
| `Pagination` | `pagination.tsx` | Accepts `currentPage`, `totalCount`, `pageSize`, callbacks |

### Existing Shared Components (`src/components/`) ✅

| Component | File | Notes |
|---|---|---|
| `AppShell` | `app-shell.tsx` | Role-based nav; mobile drawer + desktop sidebar |
| `ScheduleInfo` | `schedule-info.tsx` | Date/time/location display for a schedule |
| `PositionModal` | `position-modal.tsx` | Shows registered players per position |
| `QRModal` | `qr-modal.tsx` | QR code display for player check-in |
| `LoginModal` | `login-modal.tsx` | Auth modal overlay |
| `PublicCalendar` | `public-calendar.tsx` | Public schedule calendar |
| `PublicNav` | `public-nav.tsx` | Public homepage navigation |
| `FloatingHomeButton` | `floating-home-button.tsx` | ⚠️ Path check bug — fix in Phase 4 |

---

### Phase 1 — Foundation Fixes

> **Scope:** No new files. Targeted bug fixes and token cleanup only.
> **Goal:** Eliminate known bugs and misalignments before building on top of them.

- [ ] Fix `slideInVariants` bug: `visible` state in `src/lib/animations.ts` sets `opacity: 0` — change to `opacity: 1`
- [ ] Remove forced dark mode: delete `dark` from `className` on `<html>` in `src/app/layout.tsx`
- [ ] Fix `sonner.tsx` hardcoded `theme="dark"` — change to `theme="system"` in `src/components/ui/sonner.tsx`
- [ ] Rewrite `src/components/ui/label.tsx` to use plain `<label>` with `React.ComponentProps<"label">` — remove `@radix-ui/react-label` dependency
- [ ] Add `--brand-primary` and `--brand-primary-foreground` CSS custom properties to `globals.css`, expose via `@theme inline`
- [ ] Replace all `style={{ backgroundColor: branding.colors.primary }}` occurrences with `className="bg-brand-primary text-brand-primary-foreground"` in `src/app/auth/page.tsx` and `src/app/create-profile/page.tsx`

**Files:** `src/app/globals.css` · `src/app/layout.tsx` · `src/lib/animations.ts` · `src/components/ui/label.tsx` · `src/components/ui/sonner.tsx` · `src/app/auth/page.tsx` · `src/app/create-profile/page.tsx`

**Done when:** `slideInVariants` visible has `opacity: 1` · html element has no `dark` class · label.tsx has zero Radix imports · zero `style={{ backgroundColor: branding` occurrences · `npm run build` passes

---

### Phase 2 — Missing Primitives

> **Scope:** New primitive files in `src/components/ui/`. Also fixes the `aria-invalid` anti-pattern across existing pages.
> **Goal:** Complete the primitive library and unify error state handling.

- [ ] **Create `src/components/ui/select.tsx`** — Styled `<select>` wrapper. Match Input primitive exactly: `rounded-lg`, `border-input`, same focus ring, `aria-invalid` support. Minimum props: extends `React.ComponentProps<"select">`. Default height `h-9` (use `size="sm"` for `h-8` variant).
  - Replacement sites: `admin/schedules/page.tsx` (3×) · `admin/registrations/page.tsx` (3×) · `admin/logs/page.tsx` (1×) · `create-profile/page.tsx` (2×) · `ui/pagination.tsx` (1×)
- [ ] **Create `src/components/ui/textarea.tsx`** — Styled `<textarea>`. Match Input styling: same border, focus ring, `aria-invalid`. Add `min-h-[80px]`, `resize-y`, `py-2`. Extends `React.ComponentProps<"textarea">`.
- [ ] **Fix `aria-invalid` pattern** across all admin form error states — replace every `className={errors.field ? 'border-destructive' : ''}` with `aria-invalid={!!errors.field}` on Input elements
  - Files: `admin/schedules/page.tsx` · `admin/registrations/page.tsx` · `admin/locations/page.tsx`

**Files:** `src/components/ui/select.tsx` (new) · `src/components/ui/textarea.tsx` (new) · all files listed in replacement sites

**Done when:** Zero copy-pasted select class strings in page files · zero `className={errors.field ? 'border-destructive' : ''}` patterns · `npm run build` passes

---

### Phase 3 — Shared Layout Components

> **Scope:** New shared components in `src/components/` (not `ui/` — these are compositions, not primitives).
> **Goal:** Eliminate the 6 major copy-paste patterns identified across admin and dashboard pages.

- [ ] **Create `src/components/page-header.tsx`**
  - Props: `title: string`, `description?: string`, `count?: number | string`, `action?: React.ReactNode`, `className?: string`
  - Renders: animated `motion.div` with page title H1, optional `<Badge variant="outline">` count, optional description, optional right-side action slot
  - Animation baked in: `initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}`
  - Replaces identical JSX on: `admin/schedules` · `admin/registrations` · `admin/locations` · `admin/logs` · (future pages)

- [ ] **Create `src/components/breadcrumb.tsx`**
  - Props: `items: { label: string; href?: string }[]`, `className?: string`
  - Renders: `<nav aria-label="Breadcrumb">` with `/` separators. Last item: `text-foreground`. Earlier items: `text-muted-foreground`; if `href` provided, renders as `<Link>` with `hover:text-foreground transition-colors`
  - Replaces identical divs on: `admin/schedules` · `admin/registrations` · `admin/locations` · `admin/logs`

- [ ] **Create `src/components/empty-state.tsx`**
  - Props: `icon: LucideIcon`, `title?: string`, `message: string`, `action?: { label: string; onClick?: () => void; href?: string; icon?: LucideIcon; variant?: ButtonVariant }`, `className?: string`
  - Renders: `p-12 text-center` wrapper · icon at `size={48}` with `text-muted-foreground/40` · optional bold title · message text · optional action Button
  - Replaces on: `admin/schedules` · `admin/registrations` (×2 — schedules section + registrations section) · `admin/locations` · `admin/logs`

- [ ] **Create `src/components/table-skeleton.tsx`**
  - Props: `columns: { width: string; hidden?: 'sm' | 'md' | 'lg'; multiline?: boolean }[]`, `rows?: number` (default 3), `className?: string`
  - Renders: `<TableBody>` with skeleton `<TableRow>` elements using `animate-pulse` div placeholders
  - Replaces on: `admin/schedules` · `admin/registrations` · `admin/locations`

- [ ] **Create `src/components/filter-accordion.tsx`**
  - Props: `label?: string` (default `'Filters'`), `activeCount?: number`, `icon?: LucideIcon` (default `Filter`), `children: React.ReactNode`, `defaultOpen?: boolean`, `className?: string`
  - Manages own `open` state. Button shows `"Filters"` or `"Filters (2)"` when `activeCount > 0`. Framer Motion height animation for children.
  - Replaces on: `admin/schedules` · `admin/registrations` · `admin/logs`

- [ ] **Create `src/components/dashboard-card.tsx`**
  - Props: `href: string`, `title: string`, `description: string`, `icon?: LucideIcon`, `staggerIndex?: number`, `disabled?: boolean`, `className?: string`
  - When `disabled`: renders as `<div>` with `opacity-50 cursor-not-allowed pointer-events-none` (not a `<Link>`)
  - Animation: wraps content in `<motion.div custom={staggerIndex} initial="hidden" animate="visible" variants={fadeUpVariants}>`
  - Replaces on: `admin/page.tsx` · `player/page.tsx` · `facilitator/page.tsx` · `dashboard/page.tsx`

**Files:** 6 new component files in `src/components/`

**Done when:** All 6 components exist with TypeScript prop interfaces · `npm run build` passes

---

### Phase 4 — Page-Level Refactors

> **Scope:** Update all existing pages to use Phase 2 & 3 components. Mechanical substitution.
> **Goal:** Every page follows the documented patterns with no copy-paste.

**Admin pages — adopt all new components:**

- [ ] `src/app/admin/schedules/page.tsx` — Adopt `Breadcrumb`, `PageHeader`, `FilterAccordion`, `TableSkeleton`, `EmptyState`, `Select`
- [ ] `src/app/admin/registrations/page.tsx` — Adopt `Breadcrumb`, `PageHeader`, `FilterAccordion`, `TableSkeleton`, `EmptyState` (×2), `Select`
- [ ] `src/app/admin/locations/page.tsx` — Adopt `Breadcrumb`, `PageHeader`, `TableSkeleton`, `EmptyState`, `Select`
- [ ] `src/app/admin/logs/page.tsx` — Adopt `Breadcrumb`, `PageHeader`, `FilterAccordion`, `EmptyState`; replace `text-blue-600 dark:text-blue-400` / `text-yellow-600` / `text-red-600` log level colors with semantic badge tokens

**Dashboard pages — adopt `DashboardCard`:**

- [ ] `src/app/admin/page.tsx` — Replace card grid with `<DashboardCard>` using Lucide icons; remove emoji from titles
- [ ] `src/app/player/page.tsx` — Same
- [ ] `src/app/facilitator/page.tsx` — Same
- [ ] `src/app/dashboard/page.tsx` — Same

**Form pattern fixes:**

- [ ] `src/app/auth/page.tsx` — Migrate from manual `useState` form to React Hook Form + Zod. Create `src/lib/validations/auth.ts` with `signInSchema` and `signUpSchema`. Consolidate `getAuthErrorMessage` into `src/lib/errors/messages.ts`
- [ ] `src/app/create-profile/page.tsx` — Replace 2 native `<select>` elements with `<Select>` from Phase 2

**Bug fixes:**

- [ ] `src/components/floating-home-button.tsx` — Fix path check: change `pathname.startsWith('/registration/')` to `pathname.startsWith('/register/')`

**Files:** All admin page files · all dashboard page files · `auth/page.tsx` · `create-profile/page.tsx` · `floating-home-button.tsx` · new `src/lib/validations/auth.ts`

**Done when:** All admin pages use new components · all dashboards use `DashboardCard` · auth page uses React Hook Form · `npm run lint` passes with zero warnings · `npm run build` passes · mobile (375px) and desktop (1280px) visually verified on all refactored pages

---

## 12. Known Issues Log

Inconsistencies that don't fit cleanly into a phase but must not be forgotten. Address opportunistically or add to a future phase.

| Issue | Location | Notes |
|---|---|---|
| Dashboard content is duplicated | `dashboard/page.tsx` + `admin/page.tsx` + `player/page.tsx` + `facilitator/page.tsx` | After Phase 4 all use `DashboardCard`. Consider whether role-specific pages should redirect to `/dashboard` (separate decision) |
| Auth `getAuthErrorMessage` duplicates `getUserFriendlyMessage` | `auth/page.tsx` vs `src/lib/errors/messages.ts` | Consolidate during Phase 4 auth refactor |
| `public-nav.tsx` "Dashboard" link uses raw `buttonVariants` string | `src/components/public-nav.tsx` | Should use `<Button>` component with `render` or `asChild` pattern |
| `input[type=number]` for birth year has no HTML min/max | `create-profile/page.tsx` | Zod validates correctly but browser has no native constraint — add `min={1900}` `max={new Date().getFullYear()}` |
| `DropdownMenu` and `NavigationMenu` primitives exist but are unused | `src/components/ui/` | Keep — they are pre-built for future use. Remove only if confirmed unnecessary after Phase 4 |
| `public-nav.tsx` auth button uses hardcoded color classes | `src/components/public-nav.tsx` | Address when public pages are styled |

---

*Last updated: 2026-03-19*
*Status: Documentation complete — implementation deferred to future sessions*
