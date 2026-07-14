# Kinetix UI Rebuild — Agent Brief

Paste this whole file to your coding agent as the task instructions. It works together with `design-system.md` (the token/component spec) — that file defines *what things should look like*, this file defines *what to do, in what order, and what to stop doing*.

**Do not start writing code until you've read `design-system.md` in full.** Every visual decision below refers back to it.

---

## 0. Ground rules (apply to every step below)

- Never introduce a color, spacing value, radius, or shadow that isn't a token in `design-system.md`. If you're about to write a raw hex code or a px value that isn't on the spacing scale, stop — you're about to repeat the mistake that caused this rebuild.
- Never create a new one-off styled component when an existing `ui/` component (or a documented variant of it) already covers the case.
- One primary-colored (`--color-primary`) element per screen section. If you're tempted to make a second thing purple to make it "stand out," use `Outline` instead.
- Light theme only. Do not add `.dark` classes or dark backgrounds anywhere.
- After each phase, stop and show a screenshot/diff before moving to the next phase — don't do all four phases in one uninterrupted pass.

---

## 1. Specific bugs to fix (found in current build — fix these explicitly, don't just "restyle")

1. **Two different purples exist in the app right now** — the page-level "Create Ad" button and the modal's "Generate Creative" button are different shades. Audit every button, badge, and highlight in the app and replace any purple that isn't exactly `--color-primary` (`rgb(132, 0, 255)`).
2. **Sidebar hover-expand bug:** hovering the primary sidebar currently swaps out the secondary "Meta Ads" sub-navigation entirely instead of showing both at once. Replace this with the fixed dual-panel layout defined in `design-system.md` Section 8 (Panel A = 64px icon rail, always icon-only, tooltip on hover only; Panel B = 240px, always visible, shows the active module's sub-nav). Neither panel should ever cover, replace, or push the other.
3. **Approve/reject icons floating outside the card:** on the Ad Library rows, the ✓ / ✕ icon buttons sit in a separate disconnected box to the right of the card. Move them inside the card's own padding as row actions (see "List/row card" convention in `design-system.md` Section 7).
4. **Skeleton/loading card doesn't match real content shape:** the "Generating your ad…" card currently shows blurry ghost blocks unrelated to the final card's layout, plus a stray thin progress bar. Rebuild it as a proper `Skeleton` that mirrors the real ad-creative card's exact layout (thumbnail block, title line, subtitle line) per the Skeleton spec.
5. **Format-selection cards in the "Create New Ad" modal:** "Video Ad" is currently a solid filled purple block while "Static Image" is a plain outline — inconsistent, and the solid fill overuses the accent color. Rebuild both as the "Selectable option card" convention: default = white + border, selected = `--color-primary-subtle` bg + `2px --color-primary` border. Same icon treatment for both options.
6. **Modal "Cancel" button is invisible** — no border, no background, easy to miss next to the heavy primary button. Change it to the `Outline` button variant.
7. **Modal spacing/scroll:** the modal currently has a visible internal scrollbar and cramped gaps between the format options and the category field. Apply `space-6` padding on the modal body and `space-4` between form groups; only add internal scroll if content genuinely exceeds a reasonable modal height (viewport minus ~200px), and style the scroll area so it doesn't look like an accidental overflow.
8. **Tabs / segmented control:** "All Formats / Video Ads / Image Ads" is currently a bordered segmented control. Decide once, app-wide: either underline tabs (per `design-system.md` Tabs spec) or a segmented control — pick one and use it for every tab-like control in the app. Don't mix both patterns.

---

## 2. Execution order

### Phase 1 — Tokens
Update the global CSS with the semantic tokens from `design-system.md` Section 2.3 (danger/success/warning/info + bg/border variants, disabled-text token). Confirm radius and shadow variables match Section 5 exactly. No visual change should be user-visible yet beyond new tokens existing.

### Phase 2 — Base components (`ui/` folder)
Go file by file through `Button.tsx`, `Input.tsx`, `card.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `Loader.tsx`, `select.tsx`, `skeleton.tsx`, `SplashScreen.tsx`, `table.tsx`, `tabs.tsx` and bring each to the exact spec in `design-system.md` Section 7 — sizes, padding, radius, states (hover/focus/disabled/error/loading). This one phase fixes most of the app at once, since every page is built from these.

### Phase 3 — App shell
Rebuild the sidebar as the two fixed panels described in Section 8, and the navbar to match. This directly fixes bug #2 above.

### Phase 4 — Pages, one at a time
Starting with the Meta Ads → Ad Library screen (the one in the screenshots), apply the Section 8 page template (title + description + one primary action, `space-8` before content) and fix the specific bugs listed in Section 1 for that screen. Then move to the next page/module and repeat — don't try to update every page simultaneously.

---

## 3. Acceptance checklist (run this after each phase)

- [ ] Every color used traces back to a token in `design-system.md` Section 2 — no raw hex anywhere new.
- [ ] Every spacing value is on the 4px scale in Section 4.
- [ ] Flat surfaces (cards, tables, sections) use a border, not a shadow. Only floating elements (dialog, drawer, dropdown, toast) use shadow.
- [ ] Only one primary-colored button/element visible per screen section.
- [ ] Sidebar: Panel A never changes width; Panel B is always visible when the module has sub-items; nothing expands or collapses on hover.
- [ ] No card has actions floating outside its own border.
- [ ] Every loading state uses the shared `Skeleton` or `Loader` component, shaped to match its real content.
- [ ] No `.dark` styles anywhere.
