# Design System — Single Source of Truth

> This file is the **only** reference an AI assistant (or a developer) should use when building or editing UI.
> If a rule here conflicts with something already in the codebase, **this file wins** — flag the conflict and fix the code, don't fix the file.
> Never invent a color, spacing value, radius, shadow, or font size that isn't listed below. If a situation isn't covered, pick the closest existing token and ask before adding a new one.

Theme: **light only**. Do not add dark mode variants, dark backgrounds, or `.dark` overrides anywhere.

---

## 1. Design Principles (read first)

1. **One accent, used sparingly.** Primary purple means "this is the one thing to do on this screen." One primary button per view. Everything else is neutral.
2. **Neutral does the heavy lifting.** 90% of the UI is white/surface/border/text-muted. Color is not decoration — it's a signal (primary action, danger, success).
3. **Consistent scale, no one-offs.** Every spacing, radius, font-size, and shadow value must come from the tokens below. No `padding: 13px`, no `border-radius: 10px`, no random hex colors.
4. **Density over decoration.** Clean, calm, information-dense SaaS UI — not marketing-site UI. No gradients, no glassmorphism, no drop shadows on flat elements, no oversized hero-style components inside the app.
5. **Every component has exactly one visual identity.** A "Card" always looks the same everywhere. A "primary Button" always looks the same everywhere. If a component needs to look different, it's a variant (documented below), not a one-off style.

---

## 2. Color Tokens

### 2.1 Primary (brand — do not change without updating this file)
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `rgb(132, 0, 255)` `#8400FF` | Primary buttons, active nav item, active tab, links, focus ring, checked states |
| `--color-primary-hover` | `rgb(112, 0, 225)` `#7000E1` | Hover state of primary elements |
| `--color-primary-active` | `#5C00BD` | Pressed/active state |
| `--color-primary-subtle` | `#F5EBFF` | Light tint background (selected row, info banner, active nav bg) |
| `--color-primary-border` | `#E1C2FF` | Border on primary-subtle surfaces |

### 2.2 Neutrals (already in your CSS — keep exactly)
| Token | Value | Usage |
|---|---|---|
| `--color-background` | `#ffffff` | App background, card background |
| `--color-surface` | `#fafafa` | Page background behind cards, table header bg, hover bg |
| `--color-secondary` | `#f4f4f5` | Secondary button bg, chip/tag bg |
| `--color-secondary-hover` | `#e4e4e7` | Hover on secondary/ghost elements |
| `--color-border` | `#e4e4e7` | All borders — cards, inputs, dividers, table rows |
| `--color-text` | `#09090b` | Headings, primary body text |
| `--color-text-muted` | `#71717a` | Secondary text, labels, placeholders, captions |
| `--color-text-disabled` | `#a1a1aa` | Disabled text (new token — add this) |

### 2.3 Semantic (new — add these, you're currently missing a full set)
| Token | Value | Usage |
|---|---|---|
| `--color-danger` | `#ef4444` | Destructive actions, error text/border |
| `--color-danger-bg` | `#fef2f2` | Error banners, destructive-subtle bg |
| `--color-danger-border` | `#fecaca` | Border on danger-subtle surfaces |
| `--color-success` | `#10b981` | Success states, confirmations |
| `--color-success-bg` | `#ecfdf5` | Success banners |
| `--color-success-border` | `#a7f3d0` | Border on success-subtle surfaces |
| `--color-warning` | `#f59e0b` | Warning states |
| `--color-warning-bg` | `#fffbeb` | Warning banners |
| `--color-warning-border` | `#fde68a` | Border on warning-subtle surfaces |
| `--color-info` | `#3b82f6` | Informational states (distinct from primary — primary is for *actions*, info is for *messages*) |
| `--color-info-bg` | `#eff6ff` | Info banners |

**Rule: never use raw hex codes in components.** Always reference a token. If a component needs a color not on this list, that's a signal to stop and add it here first — not to invent one inline.

---

## 3. Typography

Font family: `Inter` (already set — keep as the only font, no secondary display font needed for a product UI).

| Token | Size / Line-height | Weight | Usage |
|---|---|---|---|
| `text-xs` | 12px / 16px | 400 | Captions, table meta, timestamps |
| `text-sm` | 14px / 20px | 400 / 500 | Body text, labels, button text, input text |
| `text-base` | 16px / 24px | 400 / 500 | Default body copy, form values |
| `text-lg` | 18px / 28px | 600 | Card titles, dialog titles |
| `text-xl` | 20px / 28px | 600 | Section headings |
| `text-2xl` | 24px / 32px | 700 | Page titles |
| `text-3xl` | 30px / 36px | 700 | Dashboard hero numbers only (rare) |

**Rules:**
- Page title: `text-2xl` / `font-bold` (700), always paired with a `text-sm text-muted` description directly below.
- Card/section title: `text-lg` / `font-semibold` (600).
- Body/UI text default weight is 400. Use 500 only for labels, button text, and emphasis — never 700 in running body copy.
- Never use more than 3 font sizes on one screen (title, section heading, body).

---

## 4. Spacing Scale

4px base grid. **Every** margin, padding, and gap must be one of these:

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |
| `space-16` | 64px |

**Usage conventions:**
- Inside a small component (chip, badge, input padding): `space-2`–`space-3`.
- Inside a card/panel: `space-6` (24px) padding on all sides.
- Between form fields (label→input gap): `space-2` (8px).
- Between stacked form fields: `space-4` (16px).
- Between distinct sections on a page: `space-8` (32px).
- Page outer padding: `space-6` (24px) on mobile, `space-8` (32px) on desktop.

---

## 5. Radius & Elevation

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Inputs, badges, small buttons, tags |
| `radius-md` | 8px | Buttons (default), dropdown items |
| `radius-lg` | 12px | Cards, dialogs, drawers, dropdown/select panels |
| `radius-full` | 9999px | Avatars, pills, status dots |

| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.05)` | Resting cards (optional — most cards should use a **border**, not a shadow, to stay flat) |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Dropdowns, popovers, select panels |
| `shadow-lg` | `0 10px 25px -5px rgb(0 0 0 / 0.15)` | Dialogs, drawers only |

**Rule:** Flat surfaces (cards, table, page sections) get a **1px border**, not a shadow. Shadows are reserved for elements that float above content (dropdown, dialog, drawer, popover, toast). This is the #1 fix for the "messy" look — mixing borders and shadows everywhere is what makes a UI feel undesigned.

---

## 6. Iconography

- Library: `lucide-react` only. Never mix icon sets.
- Default size: 16px inside buttons/inputs/table rows, 20px in nav/sidebar, 24px only for empty-state illustrations.
- Stroke width: `1.5`.
- Color: inherits `currentColor` (matches surrounding text) — except muted/decorative icons which use `--color-text-muted`.
- Icons are never the sole control without a text label, except in a documented icon-button (must have `aria-label` + tooltip).

---

## 7. Component Specifications

For every component below: **one visual definition, reused everywhere.** Variants are explicit and limited — no ad-hoc variants.

### Button
- Sizes: `sm` (32px height), `md` (40px height, default), `lg` (44px height).
- Padding: `sm` → 12px horizontal, `md` → 16px horizontal, `lg` → 20px horizontal.
- Radius: `radius-md` (8px).
- Variants (only these five):
  - **Primary** — bg `--color-primary`, text white, hover `--color-primary-hover`. One per screen/section max.
  - **Secondary** — bg `--color-secondary`, text `--color-text`, border none, hover `--color-secondary-hover`.
  - **Outline** — bg transparent, border `--color-border`, text `--color-text`, hover bg `--color-surface`.
  - **Ghost** — bg transparent, no border, text `--color-text`, hover bg `--color-surface`. Used for icon buttons and low-emphasis actions.
  - **Destructive** — bg `--color-danger`, text white, hover darken 10%. Only for irreversible actions.
- Text: `text-sm font-medium`.
- Disabled: 50% opacity, `cursor: not-allowed`, no hover effect.
- Loading: replace label with spinner (`Loader`, same size as text), keep button width stable (no layout shift).
- Icon + text buttons: icon 16px, `space-2` gap between icon and label.

### Input
- Height: 40px (`md`), 36px (`sm` — for dense filter bars only).
- Padding: 12px horizontal.
- Border: 1px `--color-border`, `radius-sm`.
- Focus: border `--color-primary`, 2px ring `--color-primary` at 20% opacity (already close to your current `input:focus` rule — keep, just tie the color to `--color-primary` not a hardcoded value).
- Placeholder: `--color-text-muted`.
- Error state: border `--color-danger`, helper text below in `text-xs text-danger`.
- Label: always above the input, `text-sm font-medium`, `space-2` gap to input.
- Helper/description text: `text-xs text-muted`, `space-1` gap below input.

### Card
- Background `--color-background`, border 1px `--color-border`, `radius-lg`.
- Padding: `space-6` (24px) — no exceptions for standard content cards.
- No shadow at rest. Add `shadow-sm` only if the card is interactive/clickable, and only on hover.
- Card anatomy top to bottom: optional eyebrow/label → title (`text-lg font-semibold`) → optional description (`text-sm text-muted`) → `space-4` gap → content → optional footer separated by a `border-t` with `space-4` padding-top.
- **List/row card (e.g. an ad creative, a campaign row):** thumbnail/media on the left → title + subtitle stacked in the middle → row actions (icon buttons) on the **right, inside the same card padding** — never a separate floating column outside the card border. Actions use `Ghost` icon buttons, 32px hit area, `space-2` gap between them.
- **Selectable option card** (e.g. picking a format, a plan, a template): default state is `--color-background` with `1px --color-border`. Selected state is `2px --color-primary` border + `--color-primary-subtle` background fill — never a solid/full `--color-primary` fill block. This keeps the accent legible as a state, not a shape.

### Dialog (modal)
- Widths: `sm` 400px, `md` 480px (default), `lg` 640px. Never full-width on desktop.
- Radius `radius-lg`, `shadow-lg`, padding `space-6`.
- Anatomy: Title (`text-lg font-semibold`) + close icon button top-right → `space-2` description if needed → `space-6` gap → body content → `space-6` gap → footer.
- Footer: buttons right-aligned, `space-3` gap between them, order is **Secondary/Outline (Cancel) on the left, Primary/Destructive action on the right** — the rightmost button is always the one the dialog exists for.
- Overlay: `rgba(0,0,0,0.4)`, no blur.

### Drawer
- Use instead of Dialog when the content is a longer form or needs more vertical space.
- Slides from the right. Width: 420px desktop, 100vw mobile.
- Same internal padding/title rules as Dialog. `shadow-lg`.
- Footer is sticky to the bottom of the drawer, not inline in the scroll area.

### Dropdown Menu / Select panel
- Min width 180px, `radius-lg`, `shadow-md`, border 1px `--color-border`, background white.
- Item height 36px, padding `12px` horizontal, `radius-sm` on hover highlight (bg `--color-surface`).
- Selected item (Select component): checkmark icon right-aligned, text color `--color-primary` optional, or just bold — pick bold, not color, to avoid overusing primary.
- Destructive menu items (e.g. "Delete"): text `--color-danger`, icon `--color-danger`.
- Group items with a `border-t` divider + `text-xs text-muted` uppercase group label, not extra empty space.

### Loader
- A single spinning ring using `--color-primary` as the active stroke, `--color-border` as the track.
- Sizes: `sm` 16px (inline/button), `md` 24px (inline section loading), `lg` 32px (page-level loading).
- Never use more than one loader style in the app (no mixing dots, bars, and spinners).

### Skeleton
- Background `--color-secondary` (`#f4f4f5`), subtle pulse animation (`opacity 0.6 → 1`, 1.5s loop) — never a shimmer gradient sweep, keep it calm/flat to match the rest of the system.
- Skeleton shapes must mirror the real content's shape (text line → thin rounded bar; avatar → circle; card → full card outline) so layout doesn't jump when data loads.

### SplashScreen
- Full viewport, `--color-background`, centered logo mark + `Loader` (`md`) beneath it, `space-4` gap. No marketing copy, no gradient background.

### Table
- Header row: background `--color-surface`, text `text-xs font-medium text-muted uppercase`, height 40px, `border-b`.
- Body rows: height 48px, `border-b` only (no vertical borders, no zebra striping), hover bg `--color-surface`.
- Cell padding: 16px horizontal.
- Row actions: ghost icon buttons, right-aligned, only visible on row hover (desktop) or always visible (mobile/touch).
- Empty table state: centered icon + `text-sm text-muted` message + optional primary action, inside the table body area (not a separate page).

### Tabs
- Underline style: inactive tab `text-sm text-muted`, active tab `text-sm font-medium text-text` with a 2px bottom border in `--color-primary`.
- Tab bar sits on a `border-b` for the full row; the active tab's border overlaps it.
- Padding per tab: 12px horizontal, 8px vertical. `space-6` gap between tabs.
- Never use filled/pill-style tabs and underline tabs in the same app — underline only.

---

## 8. Layout & Page Structure

### App shell — dual fixed sidebar (Supabase pattern)

```
┌────────────────────────────────────────────────────────────────┐
│ Navbar (height 56px, border-b, bg white, z-nav)                 │
├───────┬──────────┬──────────────────────────────────────────────┤
│ Panel │ Panel B  │                                              │
│  A    │(secondary│              Main content area               │
│ 64px  │ context  │        (bg --color-surface, scrollable)      │
│(icons │  nav)    │                                              │
│ only, │  240px   │  ┌────────────────────────────────────────┐  │
│ fixed)│  fixed,  │  │  Page container (max-width 1280px,      │  │
│       │ always   │  │  centered, padding 24–32px)              │  │
│       │ visible) │  └────────────────────────────────────────┘  │
└───────┴──────────┴──────────────────────────────────────────────┘
```

**This replaces the "hover to expand" idea — that's the bug you're seeing.** Two fixed, permanent panels sitting side by side, neither one covering or replacing the other:

- **Panel A — Icon rail.** Fixed width **64px**, always icon-only, never expands, never shows text on hover. Contains the logo mark at top (32–40px), one icon per top-level module (Dashboard, Meta Ads, Newsletter, Outreach, Voice Agents, Social Media, Settings), and the account/avatar menu pinned to the bottom. Icons are 20px, centered in a 40×40px hit area. On hover, show a **tooltip** with the label (small `text-xs` bubble, doesn't affect layout) — never expand the rail itself. Active module: icon color `--color-primary`, a `--color-primary-subtle` rounded-square (`radius-md`) highlight behind it.
- **Panel B — Secondary/context panel.** Fixed width **240px**, sits immediately right of Panel A, **always visible** (not conditional on hover) whenever the active module has sub-navigation. Top of panel: the module name as a header (`text-lg font-semibold`, `space-6` padding). Below it, a vertical list of sub-items, each 40px tall, `radius-md`, `12px` horizontal padding. Active sub-item: bg `--color-primary-subtle`, text `--color-primary font-medium`. Inactive: `text-text`, hover bg `--color-surface`.
- If a module has no sub-navigation (e.g. a simple settings page), Panel B either shows a single-item list or collapses to 0 width for that module — it does not disappear/reappear with animation tied to mouse position.
- Navbar: left = page/section title or breadcrumb, right = search / notifications / avatar menu. Height fixed 56px, `z-nav` (40), sits above both panels, spans full width.
- Main content background is `--color-surface` (`#fafafa`) — cards sitting on it are `--color-background` (white), which is what creates depth without shadows.
- Content max-width: 1280px for dashboards/tables, 720px for forms/settings pages (narrower = easier to scan a form).
- **On mobile:** both panels collapse into a single slide-out `Drawer` (per Section 7's Drawer spec) triggered from the navbar, showing Panel A's icons + Panel B's labels merged into one list. Don't try to preserve the two-panel layout below tablet width.

### Standard page template (use for every feature page)
```
[Page title]                                  [Primary action button]
[text-sm text-muted description]

[optional: filter bar / tabs]                                 space-6 below title block

──────────────────────────────────────────────────────────────

[Content: card grid  OR  table  OR  form]
```
- Page header block: title + description on the left, single primary action top-right, on one row, `space-8` below it before content starts.
- Only one primary-colored button in the header. Secondary actions (export, filter) are Outline or Ghost.
- Card grids: `grid-cols-1` mobile → `md:grid-cols-3` desktop (already in your CSS), gap `space-6`.
- Forms: single column, max-width 720px, fields stacked with `space-4` between fields, grouped into sections with `space-8` between sections and a `text-lg font-semibold` section heading.

### Empty / error states (every list, table, and page must define these)
- Centered in the content area, icon (24px, muted) → `space-4` → `text-sm font-medium` heading → `text-sm text-muted` description → `space-4` → optional primary button.
- Error copy states what happened and what to do next, never just "Something went wrong."

---

## 9. States (apply identically across all interactive components)

| State | Rule |
|---|---|
| Hover | Background shifts one step (e.g. white → surface, secondary → secondary-hover). Never change size/shadow on hover except for cards explicitly marked interactive. |
| Focus (keyboard) | Visible 2px ring in `--color-primary` at reduced opacity, `2px` offset. Always visible — never `outline: none` without replacing it. |
| Disabled | 50% opacity, `cursor: not-allowed`, no hover/focus effects. |
| Loading | Component-specific `Loader`, never a full-page white-out unless it's the initial `SplashScreen`. |
| Error | Border/text in `--color-danger`, message in `text-xs` directly below the field. |

---

## 10. Rules for the AI Agent (read before generating or editing any component)

1. **Never introduce a color that isn't in Section 2.** No `#000`, no `blue-500`, no arbitrary hex. If unsure, use a neutral.
2. **Never introduce a spacing value outside Section 4.** No `13px`, `18px`, `22px`. Round to the nearest token.
3. **One primary button per screen/section.** If a second "important" action is needed, it's Outline, not a second Primary.
4. **Cards get borders, not shadows.** Only floating elements (dialog, drawer, dropdown, popover, toast) get shadows.
5. **Reuse the existing component from `ui/` — never create a new one-off styled `<div>` that duplicates a Button, Card, Input, etc.** If a new variant is genuinely needed, add it as a documented variant in this file first, then implement it.
6. **Match the component spec in Section 7 exactly** — sizes, radius, padding are not "roughly" this, they're exactly this.
7. **No dark mode.** Do not add `.dark` classes, `dark:` variants, or dark backgrounds anywhere.
8. **No gradients, no glassmorphism, no blur backgrounds**, unless explicitly requested for a specific marketing/landing page (not the app itself).
9. **Every page follows the Section 8 page template** — title + description + single action at top, `space-8` before content.
10. **When editing an existing component, check this file's spec for that component before changing anything** — don't guess at new padding/sizing based on "what looks right" in isolation.
11. **If a requirement isn't covered by this file, stop and ask, or pick the closest existing token/pattern and note the assumption** — don't invent a new pattern silently.
12. **Icons: `lucide-react` only, 16/20/24px per Section 6, stroke-width 1.5.**

---

## 11. Rollout Plan (how to apply this without a rewrite)

1. **Tokens first:** Update `globals.css` to add the missing semantic tokens (Section 2.3) and disabled-text token, and make sure `--radius-*`/`--shadow-*` match Section 5 exactly. Nothing visual changes yet.
2. **Base components second:** Update each file in `ui/` (`Button.tsx`, `Input.tsx`, `card.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `Loader.tsx`, `select.tsx`, `skeleton.tsx`, `SplashScreen.tsx`, `table.tsx`, `tabs.tsx`) to match Section 7 exactly. This single pass fixes most of the "bad UI" everywhere at once, because everything else is built from these.
3. **Pages/sections third:** Once base components are consistent, go page by page applying the Section 8 layout template — page header, content max-width, spacing between sections.
4. **Because everything derives from the tokens in Section 2–5, a future rebrand (e.g. changing the primary purple) only requires editing the token values — every component and page inherits it automatically.**
