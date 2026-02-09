/**
 * Find4th Design System — "Winter Night at the Club"
 *
 * Import this file in your app to keep colors, fonts, and
 * component styles consistent with the marketing site.
 *
 * Usage:
 *   import { colors, fonts, gradients, shadows, borders, radii } from './theme';
 */

// ─── COLORS ─────────────────────────────────────────
export const colors = {
  // Backgrounds (dark → light)
  night:      "#0a0f1a",
  deepBlue:   "#0d1b2a",
  slate:      "#1b2838",

  // Text
  warm:       "#f5e6c8",   // primary headings, high-emphasis
  warmMuted:  "#c4a97d",   // body text, descriptions
  frost:      "#d1e3f8",   // info text, subtle labels

  // Accents
  emerald:     "#34d399",  // primary action, success
  emeraldDark: "#059669",  // gradient end, hover
  emeraldDeep: "#047857",  // app header bar
  amber:       "#f59e0b",  // warnings, attention, problems

  // Utility
  wire:        "#4a5568",  // mesh pattern strokes
};

// ─── ALPHA / OVERLAY COLORS ─────────────────────────
export const alpha = {
  // Borders
  borderSubtle:       "rgba(255,255,255,0.06)",
  borderEmerald:      "rgba(52,211,153,0.2)",
  borderEmeraldStrong:"rgba(52,211,153,0.4)",
  borderFrost:        "rgba(209,227,248,0.1)",
  borderAmber:        "rgba(245,158,11,0.2)",

  // Surfaces
  cardDefault:        "rgba(255,255,255,0.02)",
  cardHighlight:      "rgba(52,211,153,0.06)",
  cardAmber:          "rgba(245,158,11,0.04)",
  cardEmerald:        "rgba(52,211,153,0.04)",
  calloutFrost:       "rgba(209,227,248,0.05)",
  navScrolled:        "rgba(10,15,26,0.95)",

  // Icon / tag backgrounds
  iconBgEmerald:      "rgba(52,211,153,0.1)",
  iconBgAmber:        "rgba(245,158,11,0.15)",
  tagBgEmerald:       "rgba(52,211,153,0.1)",
  tagBgAmber:         "rgba(245,158,11,0.1)",
  tagBgFrost:         "rgba(209,227,248,0.05)",

  // Glow
  glowEmerald:        "rgba(52,211,153,0.15)",
  glowAmber:          "rgba(245,158,11,0.1)",

  // State
  activeBg:           "rgba(52,211,153,0.05)",
  activeBorder:       "rgba(52,211,153,0.15)",
  hoverBg:            "rgba(255,255,255,0.05)",

  // Footer / muted
  mutedText:          "rgba(196,169,125,0.5)",
  divider:            "rgba(255,255,255,0.05)",
};

// ─── FONTS ──────────────────────────────────────────
export const fonts = {
  serif: "'DM Serif Display', Georgia, serif",
  sans:  "'DM Sans', sans-serif",
  // Google Fonts URL for <link> or @import
  googleFontsUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap",
};

// ─── GRADIENTS ──────────────────────────────────────
export const gradients = {
  // Primary CTA / brand
  emerald:      "linear-gradient(135deg, #34d399, #059669)",
  // Emerald text (use with background-clip: text)
  emeraldText:  "linear-gradient(135deg, #34d399, #6ee7b7)",
  // App header bar
  appHeader:    "linear-gradient(135deg, #059669, #047857)",
  // Section backgrounds
  hero:         "linear-gradient(170deg, #0a0f1a 0%, #0d1b2a 50%, #1b2838 100%)",
  sectionDown:  "linear-gradient(180deg, #1b2838, #0d1b2a)",
  sectionUp:    "linear-gradient(180deg, #0d1b2a, #0a0f1a)",
  cta:          "linear-gradient(135deg, #0d1b2a, #0a2e1f)",
  // Phone mockup chrome
  phoneCasing:  "linear-gradient(160deg, #1f2937, #111827)",
};

// ─── SHADOWS ────────────────────────────────────────
export const shadows = {
  ctaGlow:      "0 0 40px rgba(52,211,153,0.3)",
  phoneOuter:   "0 0 80px rgba(52,211,153,0.15), 0 30px 60px rgba(0,0,0,0.5)",
  card:         "none", // dark theme cards use borders, not shadows
  cardLight:    "0 1px 3px rgba(0,0,0,0.08)", // for light UI (app mockups)
};

// ─── BORDERS ────────────────────────────────────────
export const borders = {
  card:         `1px solid ${alpha.borderSubtle}`,
  cardActive:   `1px solid ${alpha.activeBorder}`,
  cardEmerald:  `1px solid ${alpha.borderEmerald}`,
  cardAmber:    `1px solid ${alpha.borderAmber}`,
  nav:          `1px solid rgba(52,211,153,0.1)`,
  divider:      `1px solid ${alpha.divider}`,
  input:        `1px solid ${alpha.borderSubtle}`,
  inputFocus:   `1px solid ${alpha.borderEmeraldStrong}`,
};

// ─── RADII ──────────────────────────────────────────
export const radii = {
  sm:    "0.375rem",  // rounded-md  — small chips
  md:    "0.5rem",    // rounded-lg  — inputs, logo mark
  lg:    "0.75rem",   // rounded-xl  — inner cards, callouts
  xl:    "1rem",      // rounded-2xl — section cards
  full:  "9999px",    // rounded-full — buttons, pills, tags
  phone: "1.5rem",    // rounded-3xl — phone mockup
};

// ─── SPACING (reference, use Tailwind classes) ──────
export const spacing = {
  sectionPadY:  "6rem",     // py-24
  sectionPadX:  "1.5rem",   // px-6
  maxWidth:     "72rem",    // max-w-6xl
  cardPad:      "1.5rem",   // p-6
  gridGap:      "1rem",     // gap-4
  headerMargin: "4rem",     // mb-16
};

// ─── ICON SIZING ────────────────────────────────────
export const iconSize = {
  inline:    14,   // inside text, chips
  body:      16,   // body-level icons
  card:      20,   // inside icon containers
  nav:       24,   // mobile menu toggle
  section:   28,   // stat icons
  hero:      56,   // decorative hero icons
};

// ─── TAILWIND EXTEND (paste into tailwind.config.js) ─
export const tailwindExtend = {
  colors: {
    night:       "#0a0f1a",
    "deep-blue": "#0d1b2a",
    slate:       "#1b2838",
    warm:        "#f5e6c8",
    "warm-muted":"#c4a97d",
    frost:       "#d1e3f8",
    emerald: {
      DEFAULT: "#34d399",
      dark:    "#059669",
      deep:    "#047857",
    },
    amber: {
      DEFAULT: "#f59e0b",
    },
  },
  fontFamily: {
    serif: ["DM Serif Display", "Georgia", "serif"],
    sans:  ["DM Sans", "sans-serif"],
  },
  borderRadius: {
    "2xl": "1rem",
    "3xl": "1.5rem",
  },
};

// ─── CSS CUSTOM PROPERTIES (optional, paste into :root) ─
export const cssVars = `
:root {
  --color-night: #0a0f1a;
  --color-deep-blue: #0d1b2a;
  --color-slate: #1b2838;
  --color-warm: #f5e6c8;
  --color-warm-muted: #c4a97d;
  --color-frost: #d1e3f8;
  --color-emerald: #34d399;
  --color-emerald-dark: #059669;
  --color-amber: #f59e0b;
  --font-serif: 'DM Serif Display', Georgia, serif;
  --font-sans: 'DM Sans', sans-serif;
  --radius-card: 1rem;
  --radius-button: 9999px;
}
`;
