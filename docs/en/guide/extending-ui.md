---
title: UI Themes
weight: 40
---

# Extending `@spindeck/ui`

[`@spindeck/ui`](https://github.com/dongguacute/SpinDeck/tree/main/packages/ui) is SpinDeck's core visual and material system. It defines a strict **Material Contract** so theme families can swap colors, shadows, and texture without breaking layout.

## Key Concepts

| Concept | Description |
| :--- | :--- |
| **Material Contract** | A fixed set of CSS variables that themes may override. Layout, spacing, and typography stay locked in `base.css`. |
| **Theme Family** | A visual style group (e.g. Cafe) applied via a class such as `sd-theme-cafe`. |
| **Appearance Mode** | Light or dark mode, controlled with `data-theme` on the root element. |

Built-in theme families include **Cafe** — Light Mode (Cream White) and Dark Mode (Deep Roast Coffee).

## Installation

Inside the SpinDeck monorepo, add the package to your app or library:

```bash
pnpm add @spindeck/ui --workspace
```

## Basic Usage

### 1. Import styles

In your application entry CSS (e.g. `apps/web/app/app.css`):

```css
/* Material Contract defaults */
@import "@spindeck/ui/styles/base.css";

/* Theme family */
@import "@spindeck/ui/themes/cafe.css";
```

### 2. Apply theme classes

Set the theme family on `<body>` and appearance mode on `<html>`:

```html
<html data-theme="light">
  <body class="sd-theme-cafe">
    <!-- Renders in Cafe light mode -->
  </body>
</html>
```

SpinDeck's web app resolves `system` mode at runtime and syncs both attributes via `useThemeStore`.

### 3. Use TypeScript config

```typescript
import { THEMES, THEME_CONFIGS, type ThemeType, type AppearanceMode } from "@spindeck/ui";

console.log(THEME_CONFIGS[THEMES.CAFE].name);       // "咖啡馆"
console.log(THEME_CONFIGS[THEMES.CAFE].className);  // "sd-theme-cafe"
console.log(THEME_CONFIGS[THEMES.CAFE].preview.light); // "#fdfaf2"
```

## Material Contract (CSS Variables)

Theme families **must only override** these variables. Do not change layout-related properties inside theme files.

| Variable | Description |
| :--- | :--- |
| `--bg-primary` | Main background |
| `--bg-secondary` | Secondary background |
| `--bg-tertiary` | Tertiary background |
| `--surface-color` | Cards, buttons, panels |
| `--surface-hover` | Hover state for surfaces |
| `--text-primary` | Primary text |
| `--text-secondary` | Secondary text |
| `--text-muted` | Muted text |
| `--border-color` | Borders |
| `--border-highlight` | Highlight borders |
| `--shadow-raised` | Raised / neumorphic shadow |
| `--shadow-pressed` | Pressed / inset shadow |
| `--shadow-card` | Card shadow |
| `--radius-sm` … `--radius-full` | Border radii |

Animation timing tokens (`--sd-transition-*`) are defined in `base.css` and shared across all themes.

## Create a New Theme Family

### Step 1 — Add a theme CSS file

Create `packages/ui/src/themes/ocean.css`:

```css
/* Ocean theme family — Material Contract only */

.sd-theme-ocean {
  /* No layout rules here */
}

[data-theme="light"] .sd-theme-ocean,
.sd-theme-ocean[data-theme="light"] {
  --bg-primary: #e0f2f1;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f5fffe;
  --surface-color: #ffffff;
  --surface-hover: #b2dfdb;
  --text-primary: #004d40;
  --text-secondary: #00695c;
  --text-muted: #4db6ac;
  --border-color: #80cbc4;
  --border-highlight: rgba(255, 255, 255, 0.4);
  --shadow-raised: 0 4px 0 #4db6ac, 0 8px 15px rgba(0, 77, 64, 0.12);
  --shadow-pressed: 0 2px 0 #4db6ac, inset 0 2px 4px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 4px 0 #4db6ac, 0 12px 24px rgba(0, 77, 64, 0.08);
}

[data-theme="dark"] .sd-theme-ocean,
.sd-theme-ocean[data-theme="dark"] {
  --bg-primary: #004d40;
  --bg-secondary: #006064;
  --bg-tertiary: #00838f;
  --surface-color: #00838f;
  --surface-hover: #006064;
  --text-primary: #e0f2f1;
  --text-secondary: #80cbc4;
  --text-muted: #4db6ac;
  --border-color: #00695c;
  --border-highlight: rgba(224, 242, 241, 0.1);
  --shadow-raised: 0 4px 0 #004d40, 0 8px 15px rgba(0, 0, 0, 0.4);
  --shadow-pressed: 0 2px 0 #004d40, inset 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 4px 0 #004d40, 0 10px 20px rgba(0, 0, 0, 0.4);
}
```

Reference the built-in [Cafe theme](https://github.com/dongguacute/SpinDeck/blob/main/packages/ui/src/themes/cafe.css) for interaction enhancements (e.g. button press behavior).

### Step 2 — Register in TypeScript

Update `packages/ui/src/index.ts`:

```typescript
export const THEMES = {
  CAFE: 'cafe',
  OCEAN: 'ocean',
} as const;

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  [THEMES.CAFE]: { /* existing */ },
  [THEMES.OCEAN]: {
    name: 'Ocean',
    className: 'sd-theme-ocean',
    preview: {
      light: '#e0f2f1',
      dark: '#004d40',
    },
  },
};
```

The settings page iterates `THEME_CONFIGS`, so new entries appear automatically in the theme picker.

### Step 3 — Import in the web app

Add to `apps/web/app/app.css`:

```css
@import "@spindeck/ui/themes/ocean.css";
```

Rebuild `@spindeck/ui` if you are developing the package in isolation:

```bash
pnpm --filter @spindeck/ui build
```

## Design Guidelines

- **Material only** — Override CSS variables; do not set `padding`, `font-size`, `display`, or other structural properties in theme files.
- **Both modes** — Always define light and dark variable sets.
- **Preview colors** — Provide representative `preview.light` and `preview.dark` values for the settings UI swatches.
- **App-layer styling** — Page-specific layout and animations belong in `apps/web`, and should consume Material Contract variables (see `apps/web/app/app.css`).

## Package Development

```bash
pnpm --filter @spindeck/ui dev    # Watch build
pnpm --filter @spindeck/ui build  # Production build
```

CSS is exported via package subpaths:

- `@spindeck/ui/styles/base.css`
- `@spindeck/ui/themes/<name>.css`

See also [Extending `@spindeck/vinyl-ui`](./extending-vinyl-ui) for vinyl player visual styles.
