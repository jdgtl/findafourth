# CLAUDE.md — Find4th App Design Reference

When working on the Find4th app, follow these design rules to stay consistent with the marketing site and brand.

## Theme: "Winter Night at the Club"
Dark, warm, atmospheric. Think cold night outside, warm glow from the paddle courts. Never clinical or sterile.

## Quick Reference

### Colors
- **Backgrounds:** `#0a0f1a` (night/primary), `#0d1b2a` (deepBlue), `#1b2838` (slate)
- **Text:** `#f5e6c8` (warm/headings), `#c4a97d` (warmMuted/body), `#d1e3f8` (frost/info)
- **Primary accent:** `#34d399` (emerald) — CTAs, links, success, active states
- **Gradient:** `linear-gradient(135deg, #34d399, #059669)` — buttons, brand mark
- **Warning/attention:** `#f59e0b` (amber)
- **Never use pure white for text.** Warmest text is `#f5e6c8`.

### Typography
- **Headings:** `'DM Serif Display', Georgia, serif`
- **Everything else:** `'DM Sans', sans-serif`
- Google Fonts: `DM+Sans` (300-700) + `DM+Serif+Display`

### Buttons
- **Primary:** emerald gradient bg, `#0a0f1a` text, `rounded-full`, `font-semibold`
- **Secondary/ghost:** transparent bg, `1px solid rgba(209,227,248,0.2)`, frost text

### Cards
- Background: `rgba(255,255,255,0.02)`
- Border: `1px solid rgba(255,255,255,0.06)`
- Radius: `1rem` (rounded-2xl)
- Active/highlighted: `rgba(52,211,153,0.06)` bg, `rgba(52,211,153,0.2)` border

### Icons
- Library: **Lucide React** (`lucide-react`)
- Icon containers: `w-10 h-10 rounded-xl` with `rgba(52,211,153,0.1)` background
- Icon color: `#34d399` (emerald)

### Form Inputs (app-specific guidance)
- Use dark surfaces: `#1b2838` or `rgba(255,255,255,0.05)` background
- Border: `rgba(255,255,255,0.06)`, focus: `rgba(52,211,153,0.4)`
- Text: `#f5e6c8`, placeholder: `#c4a97d`
- Radius: `rounded-lg` (0.5rem)

### Spacing
- Container: `max-w-6xl mx-auto px-6`
- Section vertical: `py-24` (marketing) — in-app reduce to `py-8` or `py-12`
- Card padding: `p-6`
- Grid gap: `gap-4`

## Rules

1. **Serif for headings only.** Page titles, section titles, card titles. Never for body text, labels, or buttons.
2. **Emerald = interactive.** Buttons, links, toggles, active tabs, success. Never for error states.
3. **Amber = attention.** Warnings, empty states, problems. Never for CTAs.
4. **No pure white.** Text tops out at `#f5e6c8`. Use `#c4a97d` for body. Use `#d1e3f8` for info/secondary.
5. **Subtle cards.** Nearly invisible borders, barely-there surface contrast. The content should stand out, not the container.
6. **No heavy shadows on dark backgrounds.** Use subtle borders and glow effects instead.
7. **Rounded-full for buttons and pills.** Rounded-2xl for cards. Rounded-xl for inner elements.
8. **DM Sans for all UI.** Weights 400 (body), 500 (labels), 600 (buttons/emphasis), 700 (bold emphasis).

## Import
The full theme with all tokens is in `theme.js` in this directory. Import what you need:
```js
import { colors, fonts, gradients, alpha, borders, radii } from './theme';
```
