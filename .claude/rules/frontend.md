# Frontend Rules

## File Scope
Covers: `.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.scss`, `.html` files and component/page/view/layout/style directories.

## Design Tokens (Mandatory)
"Before writing frontend code, find the project's existing tokens file" or create one. Avoid hardcoding values. Required categories: semantic colors (with dark mode), spacing scale, border radius, shadows (elevation), typography (fonts, scale, weights), breakpoints, transitions (durations, easing), z-index.

## Dark Mode First
**Always design and implement for dark mode first.** This is the primary design target. Light mode support should be considered secondary. When building components or pages:
- Start with dark mode colors and contrast
- Ensure all interactive elements, text, and imagery are legible in dark mode
- Test dark mode thoroughly before considering light mode variations
- Dark mode is not optional — it's the baseline expectation

## Design Principles
Select one primary approach:
- **Glassmorphism**: Overlays, modern dashboards
- **Neumorphism**: Settings panels, minimal controls
- **Brutalism**: Developer tools, editorial sites
- **Minimalism**: Portfolios, documentation, content-first
- **Maximalism**: Creative agencies, e-commerce
- **Claymorphism**: Playful apps, onboarding
- **Bento Grid**: Dashboards, feature showcases
- **Aurora/Mesh Gradients**: Landing pages, hero sections
- **Flat Design**: Mobile apps, system UI
- **Material Elevation**: Data-heavy apps, enterprise
- **Editorial**: Blogs, long-form content

## Framework Selection
Use existing project libraries—don't mix competing ones. Options provided for CSS, primitives, animation, charts, and icons.

## Layout Standards
**Mobile-first, scale beautifully.** Start with mobile (single column, stacked) and enhance progressively for larger screens:
- **Mobile (< 768px)**: Single column layouts, stacked components, full-width interfaces
- **Tablet (768px - 1024px)**: Two-column grids, optimized spacing
- **Desktop (≥ 1024px)**: Multi-column grids, expanded layouts, enhanced whitespace
- Use CSS Grid for 2D layouts, Flexbox for 1D alignment
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`)
- Minimum touch targets: 44×44px (mobile) — scale proportionally on desktop
- Test at actual device sizes to ensure readable text and accessible spacing across all breakpoints

## Accessibility Requirements
Keyboard navigation, meaningful alt text, associated labels, 4.5:1 contrast ratio, visible focus indicators, color-independent design, dynamic content updates, motion preferences respected.

## Performance
Lazy-load images, optimize fonts, use `transform`/`opacity` for animations, virtualize 100+ item lists, minimize bundle imports.
