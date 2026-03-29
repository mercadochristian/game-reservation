# Frontend Rules

## File Scope
Covers: `.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.scss`, `.html` files and component/page/view/layout/style directories.

## Design Tokens (Mandatory)
"Before writing frontend code, find the project's existing tokens file" or create one. Avoid hardcoding values. Required categories: semantic colors (with dark mode), spacing scale, border radius, shadows (elevation), typography (fonts, scale, weights), breakpoints, transitions (durations, easing), z-index.

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
Grid for 2D layouts, Flexbox for 1D. Use semantic HTML. Mobile-first approach. Minimum touch targets: 44×44px.

## Accessibility Requirements
Keyboard navigation, meaningful alt text, associated labels, 4.5:1 contrast ratio, visible focus indicators, color-independent design, dynamic content updates, motion preferences respected.

## Performance
Lazy-load images, optimize fonts, use `transform`/`opacity` for animations, virtualize 100+ item lists, minimize bundle imports.
