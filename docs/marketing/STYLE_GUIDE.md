# Find4th Design System — "Winter Night at the Club"

> Use this file as a reference when building or modifying the Find4th app.
> Every color, font, spacing pattern, and component style should match or complement the marketing site.

---

## Color Palette

### Core Backgrounds (dark → light)
| Token         | Hex       | Usage                                      |
|---------------|-----------|---------------------------------------------|
| `night`       | `#0a0f1a` | Primary background, deepest layer           |
| `deepBlue`    | `#0d1b2a` | Secondary background, section alternation    |
| `slate`       | `#1b2838` | Tertiary background, cards on dark surfaces  |

### Text & Content
| Token         | Hex       | Usage                                      |
|---------------|-----------|---------------------------------------------|
| `warm`        | `#f5e6c8` | Primary headings, high-emphasis text         |
| `warmMuted`   | `#c4a97d` | Body text, secondary text, descriptions      |
| `frost`       | `#d1e3f8` | Tertiary text, info callouts, subtle labels  |

### Accent Colors
| Token         | Hex       | Usage                                      |
|---------------|-----------|---------------------------------------------|
| `emerald`     | `#34d399` | Primary action, CTAs, success states, links  |
| `emeraldDark` | `#059669` | Gradient endpoints, hover states, filled UI  |
| `amber`       | `#f59e0b` | Warnings, problem states, attention callouts |

### Utility
| Token         | Hex       | Usage                                      |
|---------------|-----------|---------------------------------------------|
| `wire`        | `#4a5568` | Wire mesh pattern, subtle structural lines   |

### Common Opacity Patterns
```
Borders:          rgba(255,255,255,0.06)   — subtle card borders
Hover borders:    rgba(52,211,153,0.2)     — emerald highlight
Glass background: rgba(10,15,26,0.95)      — nav on scroll
Glow:             rgba(52,211,153,0.15)    — emerald ambient glow
Glow (amber):     rgba(245,158,11,0.1)    — amber ambient glow
Card surface:     rgba(255,255,255,0.02)   — default card bg
Card highlight:   rgba(52,211,153,0.06)    — featured/active card bg
```

---

## Typography

### Font Families
| Token   | Stack                                  | Usage                        |
|---------|----------------------------------------|-------------------------------|
| `serif` | `'DM Serif Display', Georgia, serif`   | Headings, display text, brand |
| `sans`  | `'DM Sans', sans-serif`                | Body, UI, labels, buttons     |

### Google Fonts Import
```
https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap
```

### Type Scale (marketing reference — adapt for app density)
| Element              | Size                  | Font    | Weight   | Color        |
|----------------------|-----------------------|---------|----------|--------------|
| Hero headline        | `text-5xl / text-7xl` | serif   | default  | `warm`       |
| Section headline     | `text-3xl / text-5xl` | serif   | default  | `warm`       |
| Card title           | `text-lg`             | serif   | 600      | `warm`       |
| Step/tab title       | `text-2xl`            | serif   | default  | `warm`       |
| Body / description   | `text-sm / text-base` | sans    | 400      | `warmMuted`  |
| Small label / tag    | `text-xs`             | sans    | 600      | `emerald`    |
| Section pill label   | `text-xs uppercase`   | sans    | 400      | varies       |
| Button text          | `text-sm / text-lg`   | sans    | 600      | `night`      |

---

## Gradients

### Primary CTA / Brand
```css
background: linear-gradient(135deg, #34d399, #059669);
```

### Background Sections (alternate between these)
```css
/* Section 1 — Hero */
background: linear-gradient(170deg, #0a0f1a 0%, #0d1b2a 50%, #1b2838 100%);

/* Section 2 — darker transition */
background: linear-gradient(180deg, #1b2838, #0d1b2a);

/* Section 3 — night base */
background: #0a0f1a;

/* Section 4 — reverse */
background: linear-gradient(180deg, #0d1b2a, #0a0f1a);

/* CTA section */
background: linear-gradient(135deg, #0d1b2a, #0a2e1f);
```

### Emerald Text Gradient (headings)
```css
background: linear-gradient(135deg, #34d399, #6ee7b7);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## Component Patterns

### Cards
```
Background:     rgba(255,255,255,0.02)
Border:         1px solid rgba(255,255,255,0.06)
Border radius:  rounded-2xl (1rem)
Padding:        p-6
Hover:          scale-105 transition
```

**Highlighted / Active card:**
```
Background:     rgba(52,211,153,0.06)
Border:         1px solid rgba(52,211,153,0.2)
```

### Buttons

**Primary (CTA):**
```
Background:     linear-gradient(135deg, #34d399, #059669)
Text color:     #0a0f1a (night)
Border radius:  rounded-full
Padding:        px-8 py-4 (large) / px-5 py-2.5 (nav)
Font:           sans, font-semibold
Hover:          scale-105
Shadow (hero):  0 0 40px rgba(52,211,153,0.3)
```

**Secondary / Ghost:**
```
Background:     transparent
Border:         1px solid rgba(209,227,248,0.2)
Text color:     #d1e3f8 (frost)
Border radius:  rounded-full
Hover:          bg-white/5
```

### Pills / Tags
```
Background:     rgba(52,211,153,0.1)
Border:         1px solid rgba(52,211,153,0.2)
Text:           #34d399, text-xs, uppercase, tracking-widest
Border radius:  rounded-full
Padding:        px-4 py-1.5 (section) / px-2.5 py-1 (inline)
```

### Icon Containers
```
Size:           w-10 h-10
Background:     rgba(52,211,153,0.1)
Border radius:  rounded-xl
Icon size:      20px
Icon color:     #34d399 (emerald)
```

### FAQ Accordion
```
Closed bg:      rgba(255,255,255,0.02)
Closed border:  1px solid rgba(255,255,255,0.06)
Open bg:        rgba(52,211,153,0.05)
Open border:    1px solid rgba(52,211,153,0.15)
Toggle icon:    Plus, rotates 45deg on open
Toggle bg:      rgba(52,211,153,0.1), emerald icon
```

### Info Callout Box
```
Background:     rgba(209,227,248,0.05)
Border:         1px solid rgba(209,227,248,0.1)
Border radius:  rounded-xl
Padding:        p-4
Icon:           Lightbulb (amber)
Text:           frost color, text-sm
```

---

## Backgrounds & Effects

### Wire Mesh Overlay
SVG pattern grid at `opacity: 0.04`, stroke `#d1e3f8`, 24x24 grid.
Applied as an absolute-positioned SVG covering the section.

### Glow Orbs
Radial gradient circles with `filter: blur(60px)`, 30% opacity color stops.
Placed as absolute-positioned decorative elements.
```
Emerald orb:  radial-gradient(circle, #34d39930 0%, transparent 70%)
Amber orb:    radial-gradient(circle, #f59e0b30 0%, transparent 70%)
Sizes:        w-64/w-80/w-96, positioned off-edge
```

### Frost Particles
20 small circles (`1-4px`), `rgba(209,227,248,0.3)`, floating animation.

---

## Animations

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes floatIn {
  from { opacity: 0; transform: translateY(20px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}
```

---

## Spacing & Layout

- Max content width: `max-w-6xl` (72rem / 1152px)
- Section padding: `py-24` vertical, `px-6` horizontal
- Card grid gap: `gap-4`
- Section header bottom margin: `mb-16`
- Container: always `mx-auto px-6`

---

## Iconography

All icons from **Lucide React** (`lucide-react`). Consistent sizing:
- Inline/body: `14-16px`
- Card icon: `20px` inside 40x40 container
- Hero decorative: `56px`
- Navigation: `24px`

---

## Brand Mark

The "4" logo is a rounded square (`rounded-lg`) with the emerald gradient background and a white bold "4" inside.
```
Container: w-8 h-8 (nav) or w-7 h-7 (footer)
Background: linear-gradient(135deg, #34d399, #059669)
Text: white, font-black, text-sm
```

---

## Light / In-App UI (phone mockups, form elements)

When rendering "app-like" UI inside the dark theme (e.g. phone mockups, form previews):
```
Card bg:        white / #f8fafc
Card border:    border-gray-100
Card radius:    rounded-xl
App header:     linear-gradient(135deg, #059669, #047857), white text
Chip/tag bg:    bg-gray-100 (neutral), bg-emerald-50 (accent)
Chip text:      text-gray-600 (neutral), text-emerald-700 (accent)
Button:         bg-emerald-600, white text, rounded-full, font-bold
```

---

## Do / Don't

**Do:**
- Use `night` as the default background
- Alternate sections between `night`, `deepBlue`, and `slate`
- Keep text in `warm` / `warmMuted` family — never pure white
- Use `emerald` for interactive elements and positive states
- Use `amber` for warnings, problems, attention-needed states
- Use serif for headings, sans for everything else
- Keep cards subtle — near-invisible borders, minimal surface contrast

**Don't:**
- Use pure white (`#ffffff`) for text on dark backgrounds
- Use emerald for error or warning states (that's amber)
- Mix fonts — headings are always serif, body is always sans
- Over-saturate — the palette is intentionally muted and warm
- Use heavy box shadows on dark backgrounds — use glow orbs and subtle borders instead
