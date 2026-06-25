# @spindeck/ui

The core visual and material system for SpinDeck. Designed with a strict **Material Contract**, it supports seamless switching between multiple **Theme Families** and **Appearance Modes** (Light/Dark/System).

## Key Features

- 🎨 **Material Contract**: Defines a standard set of CSS variables, ensuring themes only change visual texture (colors, shadows, radii) without breaking UI layout stability.
- ☕ **Cafe Theme Family**: Built-in meticulously tuned "Cafe" style, featuring Light Mode (Cream White) and Dark Mode (Deep Roast Coffee).
- 🔒 **Restricted Extensibility**: Prevents UI breakage by locking layout-related CSS and only exposing material-related variables.
- 📘 **TypeScript Support**: Provides full type definitions for theme configurations and constant exports.
- 📦 **Ready to Use**: Supports ESM/CJS exports, perfectly compatible with modern build tools like Vite.

## Installation

This package is located in the `packages/ui` directory of the SpinDeck Monorepo.

```bash
# Reference in apps/web or other packages
pnpm add @spindeck/ui --workspace
```

## Usage Guide

### 1. Import Base Styles and Themes

Import in your application's entry file (e.g., `app.css`):

```css
/* Import the base Material Contract */
@import "@spindeck/ui/styles/base.css";

/* Import a specific Theme Family */
@import "@spindeck/ui/themes/cafe.css";
```

### 2. Apply Theme Class

Apply the theme family class to an HTML element and use `data-theme` to switch appearance modes:

```html
<body class="sd-theme-cafe" data-theme="light">
  <!-- The page will now render in "Cream White" style -->
</body>
```

### 3. Reference Config in TypeScript

```typescript
import { THEMES, THEME_CONFIGS } from '@spindeck/ui';

// Get theme name
console.log(THEME_CONFIGS[THEMES.CAFE].name); // "Cafe"

// Get preview color
const preview = THEME_CONFIGS[THEMES.CAFE].preview.light; // "#fdfaf2"
```

## Material Contract (CSS Variables)

All theme families must and can only override the following core variables:

| Variable | Description |
| :--- | :--- |
| `--bg-primary` | Main background material |
| `--surface-color` | Surface material (cards, buttons) |
| `--text-primary` | Primary text color |
| `--border-color` | Border color |
| `--shadow-raised` | Neumorphic raised shadow |
| `--shadow-pressed` | Neumorphic pressed shadow |
| `--radius-lg` | Core border radius |

## Extending Themes

To create a new theme family, simply define the corresponding CSS class following the Material Contract:

```css
.sd-theme-ocean {
  /* Only override material variables */
}

[data-theme="light"] .sd-theme-ocean {
  --bg-primary: #e0f2f1;
  --surface-color: #ffffff;
  /* ... */
}

[data-theme="dark"] .sd-theme-ocean {
  --bg-primary: #006064;
  --surface-color: #00838f;
  /* ... */
}
```

## Development

```bash
cd packages/ui
npm run dev   # Build in watch mode
npm run build # Build for production
```
