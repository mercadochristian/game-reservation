# Style Guide — Volleyball Reservation App

A comprehensive reference for developing components and features in this project.

---

## 1. Color System

### 1.1 Design Tokens (OKLCH Color Space)

All colors are defined as CSS variables in `src/app/globals.css` and automatically adapt between light and dark modes.

#### Light Mode (`:root`)
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(1 0 0)` | Page background |
| `--foreground` | `oklch(0.145 0 0)` | Primary text |
| `--card` | `oklch(1 0 0)` | Card/surface background |
| `--card-foreground` | `oklch(0.145 0 0)` | Card text |
| `--primary` | `oklch(0.205 0 0)` | Action highlights |
| `--primary-foreground` | `oklch(0.985 0 0)` | Text on primary |
| `--secondary` | `oklch(0.97 0 0)` | Secondary surfaces |
| `--muted` | `oklch(0.97 0 0)` | Disabled/inactive |
| `--muted-foreground` | `oklch(0.556 0 0)` | Subdued text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Errors & warnings |
| `--border` | `oklch(0.922 0 0)` | Dividers & outlines |
| `--input` | `oklch(0.922 0 0)` | Form field backgrounds |
| `--ring` | `oklch(0.708 0 0)` | Focus outlines |
| `--radius` | `0.625rem` (10px) | Base border radius |

#### Dark Mode (`.dark`)
Automatically applied via `@custom-variant dark (&:is(.dark *))`. All tokens invert for dark mode in `globals.css`. The app currently forces dark mode with `className="dark"` on page root `<div>` elements.

**Key dark mode tokens:**
- `--background`: Near black
- `--card`: Dark gray surface
- `--primary`: Very light gray (contrast-friendly)
- `--destructive`: Lighter red (perceptually equivalent to light mode)

### 1.2 Brand Colors

Brand colors are defined in `branding.json` at the project root:
```json
{
  "colors": {
    "primary": "#3b82f6",      // blue-500 — CTAs, section headers
    "secondary": "#1e40af",    // blue-800 — hover states, secondary actions
    "accent": "#f59e0b"        // amber-400 — badges, highlights
  }
}
```

**Usage:**
- Import branding in client components: `import { branding } from '@/lib/config/branding'`
- Apply brand colors via inline styles: `style={{ backgroundColor: branding.colors.primary }}`
- Never hardcode hex strings outside of `branding.json`

### 1.3 Semantic Color Usage

Use token names in Tailwind classes for semantic meanings:

| Semantic Use | Classes | Note |
|---|---|---|
| Errors | `text-destructive`, `bg-destructive/10`, `border-destructive/30` | Inline field errors always use `text-xs text-destructive` |
| Success | `text-green-500`, `bg-green-500/10` | Toast-only; no inline success banners |
| Warnings | `text-yellow-500`, `bg-yellow-500/10` | For non-blocking alerts |
| Info | Uses primary token | For neutral informational states |
| Disabled | `text-muted-foreground`, `bg-muted` | Inactive buttons, disabled fields |

### 1.4 Token Usage Rules

1. **Always use token names** in Tailwind classes: `bg-background`, not `bg-white` or hardcoded hex
2. **CSS var() for portals/inline styles**: Use `var(--card)` in Sonner toast styles, inline style objects, or components rendered outside the Tailwind CSS scope
3. **Never reference light mode values directly** in dark-mode-only code — tokens handle the adaptation

---

## 2. Typography

### 2.1 Font Stack

- **Font**: [Geist](https://vercel.com/font) (Google Font)
- **CSS Variable**: `--font-sans` (set in `layout.tsx`)
- **Applied globally** via `html` className and body `font-family` in `globals.css`

All text automatically inherits the Geist font. Never override `font-family` in component styles.

### 2.2 Type Scale

Uses Tailwind v4 defaults with global `letter-spacing: -0.01em` applied to all headings via `h1–h6` rule in `globals.css`.

| Element | Class | Size | Weight | Line-height | Notes |
|---------|-------|------|--------|-------------|-------|
| Page title | `text-2xl` | 28px | `font-bold` | 1.2 | Top-level heading (h1) |
| Section heading | `text-xl` | 20px | `font-semibold` | 1.2 | Subsection (h2/h3) |
| Subsection | `text-lg` | 18px | `font-semibold` | 1.3 | Tertiary heading (h3/h4) |
| Body text | `text-sm` (inputs default) | 14px | regular | 1.5 | Standard paragraph/label |
| Form labels | `text-sm` | 14px | `font-medium` | — | Always `font-medium` for labels |
| Helper/caption | `text-xs` | 12px | regular | 1.4 | Error messages, timestamps, metadata |

### 2.3 Typography Rules

- **Headings**: Always apply `font-weight: 700` (done globally via CSS) and inherit `-0.01em` letter-spacing
- **Body**: Use `text-sm` as the base for most content
- **Form labels**: Always wrap in `<Label>` component; use `font-medium` implicitly via the component
- **Placeholders**: Use `placeholder:text-muted-foreground` on inputs
- **Links**: Never use `text-blue-500` directly; use semantic tokens or brand colors

---

## 3. Spacing & Sizing

### 3.1 Spacing Scale

Tailwind v4 default spacing (4px = 1 unit). Follow these conventions:

| Scenario | Padding | Margin | Notes |
|----------|---------|--------|-------|
| Card/container inner padding | `p-4` (16px) | — | Standard container |
| Featured card padding | `p-6` (24px) or `p-8` (32px) | — | Hero sections, large cards |
| Form field inner padding | Built into `<Input>` component | — | Do not override |
| Gap between form fields | — | `space-y-5` (20px) | Form sections use `space-y-6` (24px) |
| Gap between cards in grid | — | `gap-6` (24px) | Standard layout spacing |
| Gap between list items | — | `gap-3` (12px) | Tight item lists |

### 3.2 Border Radius Scale

Base radius is `--radius: 0.625rem` (10px). Tailwind v4 scales it via `@theme inline`:

| Token | Value | Usage | Example Class |
|-------|-------|-------|---|
| `--radius-sm` | 0.6x base (6px) | Small buttons, chips | `rounded-sm` |
| `--radius-md` | 0.8x base (8px) | Input fields, badges | `rounded-md` |
| `--radius-lg` | 1x base (10px) | Cards, modals | `rounded-lg` |
| `--radius-xl` | 1.4x base (14px) | Large cards | `rounded-xl` |
| Full | — | Avatars, pills | `rounded-full` |

**Rules:**
- Card borders: `rounded-lg`
- Input fields: `rounded-md` or inherit from component
- Buttons: Inherit from component (usually `rounded-lg`)
- Avatars/chips: `rounded-full`

### 3.3 Button & Input Heights

| Component | Default Height | Class | Notes |
|-----------|---|---|---|
| Button (small) | 32px | `h-8` | Icon-only buttons |
| Button (default) | 36px | `h-9` | Most buttons |
| Button (large) | 44px | `h-11` | Full-width CTAs |
| Input field | 36px | `h-9` | Text inputs, selects |
| Form select | 36px | `h-9` | Dropdowns |

Heights are managed by component CVA variants. Do not override unless specifically needed.

---

## 4. Component Patterns

### 4.1 CVA (Class Variance Authority)

Every component with variants must use `cva` from `class-variance-authority`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-muted',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
```

**Rules:**
- Always export the variants function: `export { Component, componentVariants }`
- Always define `defaultVariants`
- Intersect VariantProps in the props type: `ComponentProps & VariantProps<typeof componentVariants>`
- Use `cn()` to merge variant classes with the `className` prop

### 4.2 Base UI Primitives

This project uses **@base-ui/react** primitives (via shadcn style `base-nova`) instead of raw HTML:

```tsx
import * as Button from '@base-ui/react/button'
import * as Tabs from '@base-ui/react/tabs'
```

**Prefer Base UI components when available** for better accessibility and native behavior. Fallback to `React.ComponentProps<"element">` when no primitive exists.

### 4.3 `data-slot` Convention

Every component root element must have a `data-slot` attribute for CSS targeting and debugging:

```tsx
function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

// Sub-elements use the pattern: data-slot="[component]-[part]"
<div data-slot="card-header">Header</div>
<div data-slot="card-content">Content</div>
```

This enables parent selectors in CSS: `*:has-data-[slot=card-header]`, and makes component hierarchies visible in DevTools.

### 4.4 Class Merging with `cn()`

All components use `cn()` from `@/lib/utils` (wraps `clsx` + `twMerge`):

```tsx
// Pattern: variant classes first, then prop className (allows overrides)
className={cn(buttonVariants({ variant, size }), className)}
```

This ensures:
1. Prop-supplied classes can override variant styles
2. Tailwind class conflicts are automatically resolved (newer wins)
3. Falsy values (undefined, null, false) are stripped

### 4.5 File Naming & Organization

| Location | Naming | Scope |
|----------|--------|-------|
| `src/components/ui/[name].tsx` | kebab-case | Primitive/shadcn components (Button, Input, Card, etc.) |
| `src/components/[feature]/[name].tsx` | kebab-case | Feature-specific components (future: player-card, game-list, etc.) |
| Exports | Named exports for primitives; default for pages | Composability and tree-shaking |

---

## 5. Toast / Notification Guidelines

Toasts are powered by [Sonner](https://sonner.emilkowal.ski/), styled in `src/components/ui/sonner.tsx`, and registered once in `src/app/layout.tsx`.

### 5.1 When to Use Each Toast Type

| Type | When | Example | Tone |
|------|------|---------|------|
| `toast.success()` | Async operation completed | "Check your email for the magic link!" | Affirmative, past tense |
| `toast.error()` | API/network error or validation failure | "Failed to create profile. Please try again." | Actionable, plain language |
| `toast.warning()` | Non-blocking issue user should know about | "Changes not saved yet" | Cautionary (use sparingly) |
| `toast.info()` | Neutral informational update | "Profile already up to date" | Informational (rarely used) |

**Never use:**
- `window.alert()` — blocks user interaction; use toast instead
- `window.confirm()` — use a `<Dialog>` component instead
- Inline `<Alert>` banners for API errors — use toasts

### 5.2 Message Guidelines

**Success messages:**
- Confirm the action in past tense: "Check your email for the magic link!"
- Keep under 80 characters for the title

**Error messages:**
- Be specific but not technical: "Failed to create profile. Please try again."
- Never expose raw Supabase error messages to production users (log them server-side instead)
- Provide next steps if possible: "Invalid email. Please check and try again."
- Keep under 120 characters

**Message structure:**
- Title only for simple messages: `toast.success('Done!')`
- Title + description for complex messages: `toast.error('Failed', { description: 'Please try again.' })`

### 5.3 Usage Pattern

```tsx
import { toast } from 'sonner'

// In async handlers:
async function handleSubmit() {
  try {
    const response = await fetch('/api/endpoint', { ... })
    if (!response.ok) {
      toast.error('Failed to save. Please try again.')
      return
    }
    toast.success('Saved successfully!')
  } catch (error) {
    console.error('Unexpected error:', error)
    toast.error('Something went wrong. Please try again.')
  }
}
```

### 5.4 Toaster Configuration

Defined once in `src/components/ui/sonner.tsx`, registered once in `src/app/layout.tsx`:

```tsx
<Toaster
  theme="dark"          // App forces dark mode; always use theme="dark"
  position="top-right"  // Default position; override per-toast if needed
  richColors            // Enables semantic coloring (success/error/warning/info)
/>
```

**Key gotcha:** The `<Toaster>` lives in `<body>` which has no `dark` class. Without `theme="dark"`, toasts render in light mode while the rest of the UI is dark. The wrapper component handles this.

---

## 6. Form Patterns

### 6.1 Stack

- **Form state**: [react-hook-form](https://react-hook-form.com/) with `zodResolver`
- **Validation schema**: [Zod](https://zod.dev/) (stored in `src/lib/validations/`)
- **Error handling**: Field-level errors inline, form-level/API errors via toast

### 6.2 Basic Form Structure

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formSchema, type FormData } from '@/lib/validations/forms'

export default function FormPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  async function onSubmit(data: FormData) {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed')
      toast.success('Submitted!')
    } catch (error) {
      toast.error('Failed to submit. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Field section */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <>Submitting...</> : 'Submit'}
      </Button>
    </form>
  )
}
```

### 6.3 Field Template

```tsx
<div className="space-y-2">
  <Label htmlFor="field-id" className="text-foreground">
    Label Text
  </Label>
  <Input
    id="field-id"
    type="email"
    placeholder="Placeholder text"
    className="bg-muted border-input text-foreground placeholder:text-muted-foreground"
    {...register('fieldName')}
  />
  {errors.fieldName && (
    <p className="text-xs text-destructive">{errors.fieldName.message}</p>
  )}
</div>
```

**Rules:**
- Label always immediately precedes input (no gaps)
- Field errors always `text-xs text-destructive`, placed directly below input
- Use `placeholder:text-muted-foreground` for placeholder styling
- Set `bg-muted` on inputs for better visual separation

### 6.4 Error Display Rules

| Error Type | Display Method | Note |
|---|---|---|
| Zod validation errors | Inline below field, `text-xs text-destructive` | Always field-level validation |
| API/server errors | `toast.error()` | Never render Alert banners for API errors |
| Form-level validation | API response or custom logic | Handle in `onSubmit` catch block |

### 6.5 Loading & Disabled States

```tsx
{/* Submit Button */}
<Button
  type="submit"
  disabled={isSubmitting}
  className="w-full"
>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

Always:
- Disable the submit button while submitting (`disabled={isSubmitting}`)
- Show a spinner icon (Loader2 from lucide-react)
- Update button text to "Loading...", "Signing in...", etc.

### 6.6 Phone Number Formatting (Special Case)

Display value is formatted (e.g., "09..." or "63..."), but the form value is E.164 ("+639..."):

```tsx
const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 13)
  setPhoneDisplay(digits)
}

const handlePhoneBlur = () => {
  let cleaned = phoneDisplay.replace(/\D/g, '')
  if (cleaned.startsWith('63')) cleaned = cleaned.slice(2)
  else if (cleaned.startsWith('0')) cleaned = cleaned.slice(1)
  cleaned = cleaned.slice(0, 10)
  setPhoneDisplay(cleaned)
  setValue('contact_number', cleaned ? `+63${cleaned}` : '')
}

<Input
  value={phoneDisplay}
  onChange={handlePhoneChange}
  onBlur={handlePhoneBlur}
  placeholder="09123456789"
  {...register('contact_number')}
/>
```

---

## 7. Icon Usage (Lucide React)

All icons come from [Lucide React](https://lucide.dev/).

### 7.1 Import & Sizing

```tsx
import { IconName, AlertCircle, ChevronDown, Loader2 } from 'lucide-react'

// Default sizing (managed by component CVA):
<Button>
  <Mail className="h-4 w-4" />
  Send Email
</Button>

// Override size when needed:
<AlertCircle className="h-6 w-6" />  // Larger icon
<Loader2 className="h-5 w-5" />      // Medium icon
```

**Default size:** `h-4 w-4` (16px) for most component icons. Buttons and other components manage sizing via CVA.

### 7.2 Color & Styling

Icons inherit color from parent:

```tsx
<Mail className="text-muted-foreground" />        // Subdued
<AlertCircle className="text-destructive" />      // Error highlight
<Loader2 className="text-primary animate-spin" /> // Loading spinner
```

**Rules:**
- Never set `fill` on icons — use `stroke` only (currentColor)
- Always use semantic color classes (text-destructive, text-primary, etc.)
- Let icons inherit color from parent by default

### 7.3 Loading Spinner

```tsx
import { Loader2 } from 'lucide-react'

<Loader2 className="h-4 w-4 animate-spin" />
```

The `animate-spin` class is built into Tailwind v4.

---

## 8. Animation (Framer Motion)

[Framer Motion](https://www.framer.com/motion/) is used for page transitions and element staggering.

### 8.1 Standard Variants

#### Fade + Slide Up (Page Entry)

```tsx
import { motion } from 'framer-motion'

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export function MyPage() {
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUpVariants}>
      {/* Content */}
    </motion.div>
  )
}
```

#### Staggered Children (Item Lists)

```tsx
import { motion } from 'framer-motion'

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: custom * 0.08 },
  }),
}

export function ItemList({ items }: { items: Item[] }) {
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial="hidden"
          animate="visible"
          custom={i}
          variants={fadeUpVariants}
        >
          {/* Item */}
        </motion.div>
      ))}
    </div>
  )
}
```

**Stagger delay:** Multiply the item index by a fixed delta:
- **Fast stagger**: `custom * 0.05` (auth pages)
- **Standard stagger**: `custom * 0.08` (create-profile page)
- **Slow stagger**: `custom * 0.1` (dashboards with many items)

### 8.2 Rules

1. **Animate opacity and transform only** — never animate `width`, `height`, or `top`/`left` (layout-breaking)
2. **Duration:** Standard is 0.4s with `ease: 'easeOut'`
3. **Use AnimatePresence** only when conditionally mounting/unmounting elements; it's not needed for static lists
4. **Reduce motion:** Not yet implemented; plan to add `useReducedMotion()` hook in future to respect user preferences

---

## 9. Dark Mode

### 9.1 Current Approach (Forced Dark)

All pages currently force dark mode by adding `className="dark"` to their root `<div>`:

```tsx
export default function AuthPage() {
  return (
    <div className="dark min-h-screen flex items-center justify-center">
      {/* Page content */}
    </div>
  )
}
```

The `@custom-variant dark (&:is(.dark *))` directive in `globals.css` makes Tailwind's `dark:` modifier work within any `className="dark"` subtree.

### 9.2 Future Light Mode Support

When theme switching is implemented:
1. Remove `className="dark"` from all page roots
2. Add dynamic theme management to `src/app/layout.tsx` (via [next-themes](https://github.com/pacocoursey/next-themes) or custom hook)
3. All color usage already uses semantic token classes (`bg-background`, `text-foreground`) — no component changes needed

### 9.3 Dark Mode Rules

- **Always use semantic token classes** in Tailwind: `bg-card`, `text-foreground`, `text-muted-foreground`
- **Never hardcode color classes** for dark mode: no `dark:bg-gray-900` (use tokens instead)
- **CSS variables in portals/inline styles:** Use `var(--card)` syntax; tokens work through inheritance
- **Brand colors:** Continue using `branding.colors.*` via inline styles; these don't adapt to theme automatically

---

## 10. File & Folder Structure

### 10.1 Canonical Folder Layout

```
src/
├── app/
│   ├── globals.css              # Global styles, design tokens (OKLCH), Tailwind v4 config
│   ├── layout.tsx               # RootLayout (Geist font, metadata, <Toaster> registration)
│   ├── page.tsx                 # Root index page
│   ├── [auth paths]/
│   │   ├── page.tsx             # Auth page ('use client', forms, toasts)
│   │   └── callback/route.ts   # Auth callback handler (server)
│   ├── [dashboard paths]/
│   │   ├── page.tsx             # User dashboard ('use client')
│   │   └── layout.tsx           # Shared dashboard layout (if needed)
│   ├── [form paths]/
│   │   └── page.tsx             # Onboarding form ('use client')
│   └── api/
│       └── [resource]/[action]/route.ts  # API route (server)
│
├── components/
│   ├── ui/                      # Primitive/shadcn components (all from @base-ui/react or shadcn)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── alert.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── table.tsx
│   │   └── sonner.tsx           # Toaster wrapper (Sonner)
│   │
│   └── [feature]/               # Feature-specific components (future)
│       ├── game-card.tsx
│       ├── player-profile.tsx
│       └── [etc].tsx
│
├── lib/
│   ├── utils.ts                 # cn() helper, other utilities
│   ├── config/
│   │   └── branding.ts          # branding.json loader, getBrandingMeta()
│   ├── supabase/
│   │   ├── client.ts            # Supabase client (browser)
│   │   ├── server.ts            # Supabase client (server)
│   │   ├── service.ts           # Supabase service client (privileged)
│   │   └── middleware.ts        # Auth middleware
│   └── validations/
│       ├── auth.ts              # Zod schemas: loginSchema, LoginFormData
│       ├── profile.ts           # Zod schemas: onboardingSchema, OnboardingFormData
│       └── [etc].ts
│
├── types/                       # Shared TypeScript type definitions
│   └── [etc].ts
│
└── middleware.ts                # Next.js middleware (auth guard, redirects)

# Project root files
├── branding.json                # Brand config (colors, name, logo, social)
├── components.json              # shadcn/ui config (style: base-nova)
├── postcss.config.mjs           # PostCSS config for Tailwind
├── tailwind.config.ts           # NOT USED (Tailwind v4 uses @theme inline in globals.css)
├── tsconfig.json
├── package.json
└── STYLE_GUIDE.md               # This file
```

### 10.2 Naming Conventions

| Type | Convention | Examples |
|------|-----------|----------|
| Files | kebab-case | `button.tsx`, `dropdown-menu.tsx`, `user-profile.tsx` |
| Components | PascalCase (exports) | `export function Button() {}` |
| Pages | PascalCase (default export) | `export default function AuthPage() {}` |
| Zod schemas | camelCase (exports) | `export const loginSchema = z.object(...)` |
| Type definitions | PascalCase | `export type LoginFormData = { ... }` |
| Supabase clients | camelCase (functions) | `createClient()`, `createServiceClient()` |
| CSS variables | kebab-case | `--primary`, `--card-foreground` |

### 10.3 Import Patterns

```tsx
// Components
import { Button } from '@/components/ui/button'
import { SomethingCard } from '@/components/[feature]/something-card'

// Utilities
import { cn } from '@/lib/utils'
import { branding } from '@/lib/config/branding'

// Icons
import { Mail, Loader2, ChevronDown } from 'lucide-react'

// Validation
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'

// Supabase
import { createClient } from '@/lib/supabase/client'
```

Always use absolute imports (`@/...`); relative imports are harder to maintain as the codebase grows.

---

## Quick Reference

### Creating a New Page
1. Create `src/app/[route]/page.tsx` with `'use client'` at the top (if interactive)
2. Add `className="dark"` to the root `<div>`
3. Import and use the `motion` wrapper for fade-up entry animation
4. Use `toast` for all user feedback (errors, success, warnings)
5. Handle forms with `useForm` + `zodResolver` + Zod schema from `@/lib/validations/`

### Creating a New Component
1. Create `src/components/ui/[name].tsx` (primitives) or `src/components/[feature]/[name].tsx` (feature-specific)
2. Use `cva` for variants, export both component and `[componentName]Variants`
3. Add `data-slot="[component-name]"` to root element
4. Use `cn()` to merge variant classes with `className` prop
5. Use Base UI primitives when available; fall back to HTML with `React.ComponentProps<"element">`

### Creating a New Form
1. Define Zod schema in `src/lib/validations/[form-name].ts`
2. Import `useForm` + `zodResolver` in your page component (`'use client'`)
3. Use the field template (Label + Input + error text) for each field
4. Call `toast.error()` on API failure; `toast.success()` on success
5. Show loading state with `animate-spin` Loader2 icon and disabled submit button

---

## Additional Resources

- [Tailwind v4 Docs](https://tailwindcss.com)
- [Sonner Toast Docs](https://sonner.emilkowal.ski/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Lucide Icons](https://lucide.dev/)
- [Base UI Components](https://base-ui.com/)
