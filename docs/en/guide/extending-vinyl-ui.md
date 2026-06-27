---
title: Vinyl Styles
weight: 50
---

# Extending `@spindeck/vinyl-ui`

[`@spindeck/vinyl-ui`](https://github.com/dongguacute/SpinDeck/tree/main/packages/vinyl-ui) is SpinDeck's modular vinyl record player UI library. It separates **structure** (layout, animation, interaction) from **decoration** (colors, grooves, sheen) so new visual styles can be added with CSS alone.

## Features

- **Interactive tonearm** — Drag the arm onto the record to play; lift to pause.
- **Playback feedback** — Spin animation and glow effects sync with playback state.
- **Adaptive layout** — Size and position adjust to the viewport via CSS variables.
- **Extensible styling** — Base + theme CSS architecture for new vinyl looks.

## Installation

Add to your workspace package:

```json
{
  "dependencies": {
    "@spindeck/vinyl-ui": "workspace:*"
  }
}
```

Or from the monorepo root:

```bash
pnpm add @spindeck/vinyl-ui --workspace
```

## Basic Usage

### 1. Import styles

Import base structure and at least one style theme in your global CSS:

```css
@import "@spindeck/vinyl-ui/styles/base.css";
@import "@spindeck/vinyl-ui/styles/classic.css";
@import "@spindeck/vinyl-ui/styles/modern.css";
```

### 2. Render the component

```tsx
import { SongVinylOverlay } from "@spindeck/vinyl-ui";

function PlayerPage() {
  return (
    <SongVinylOverlay
      song={currentSong}
      platform="QQMusic"
      visible={true}
      pageSessionId="unique-session-id"
      styleName="classic"
      theme="dark"
      tonearmTitle={t("vinyl.tonearm_title")}
      playLabel={t("vinyl.play")}
      pauseLabel={t("vinyl.pause")}
    />
  );
}
```

Shared packages do not depend on `i18next`. Pass translated strings from the app layer via props.

## Component API

### `SongVinylOverlay`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `song` | `SongInfo` | Required | Song metadata (name, artist, cover). |
| `platform` | `PlatformType` | Required | Music platform for playback control. |
| `visible` | `boolean` | Required | Visibility and entry animations. |
| `pageSessionId` | `string` | Required | Unique ID for the current page session. |
| `theme` | `"dark" \| "light"` | `"dark"` | Used to derive glow colors. |
| `styleName` | `string` | `"classic"` | Maps to `.sd-vinyl-style-${styleName}`. |
| `tonearmPortalRef` | `RefObject` | — | Optional portal target for the tonearm layer. |
| `tonearmTitle` | `string` | — | Tooltip for the tonearm (pass translated text). |
| `playLabel` / `pauseLabel` | `string` | — | Accessible labels for playback actions. |
| `vinylColor` / `labelColor` | `string` | — | Override colors derived from album art. |

### Other exports

- `VinylStylePreview` — Mini preview for style pickers.
- `Tonearm` — Standalone tonearm SVG component.
- Layout and color utilities from `./lib/vinyl-layout` and `./lib/colors`.

## CSS Architecture

### Base layer (`base.css`)

Handles positioning, z-index, spin animations, tonearm interaction, and responsive sizing. Key classes:

| Class | Role |
| :--- | :--- |
| `.sd-vinyl-stage` | Main overlay container |
| `.sd-vinyl-disc` | Vinyl disc element |
| `.sd-vinyl-grooves` / `.sd-vinyl-grooves--fine` | Groove texture layers |
| `.sd-vinyl-sheen` | Highlight / reflection layer |
| `.sd-vinyl-center` | Label area (title, artist) |
| `.sd-vinyl-arm-wrap` / `.sd-vinyl-arm` | Tonearm wrapper and SVG |
| `.sd-vinyl-stage--playing` / `--pending` / `--interactive` | State modifiers |

Layout CSS variables (set by `computeVinylLayout`):

- `--vinyl-size` — Disc diameter in pixels
- `--vinyl-offset-x` — Horizontal offset from center
- `--tonearm-height-ratio` — Tonearm height relative to disc

### Style layer (`classic.css`, `modern.css`, …)

Each style uses the prefix `.sd-vinyl-style-<name>` and decorates base elements. Built-in styles:

| Style | Character |
| :--- | :--- |
| `classic` | Rich grooves, warm gradients, detailed sheen |
| `modern` | Flat, high-contrast, minimal texture |

## Create a New Vinyl Style

### Step 1 — Add a style CSS file

Create `packages/vinyl-ui/src/styles/retro.css`:

```css
.sd-vinyl-style-retro .sd-vinyl-disc {
  --vinyl-color: #c62828;
  --vinyl-label-color: #ffeb3b;
  background:
    radial-gradient(circle at 50% 50%, transparent 18%, rgba(255, 255, 255, 0.08) 19%, transparent 20%),
    radial-gradient(circle, color-mix(in srgb, var(--vinyl-color) 60%, #000) 0%, var(--vinyl-color) 100%);
  border: 4px solid color-mix(in srgb, var(--vinyl-color) 50%, white);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.sd-vinyl-style-retro .sd-vinyl-grooves {
  background: repeating-radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.12) 0 0.5px,
    transparent 0.5px 2px
  );
  opacity: 0.8;
}

.sd-vinyl-style-retro .sd-vinyl-center {
  border: 2px solid rgba(255, 255, 255, 0.2);
}
```

Use `--vinyl-color` and `--vinyl-label-color` so the component can inject colors from album artwork at runtime.

### Step 2 — Import in the web app

Add to `apps/web/app/app.css`:

```css
@import "@spindeck/vinyl-ui/styles/retro.css";
```

### Step 3 — Expose in settings

Register the style ID wherever the picker lists options. In SpinDeck, update `SettingsModal.tsx`:

```tsx
{["classic", "modern", "retro"].map((styleId) => (
  // ...
  <VinylStylePreview styleName={styleId} /* ... */ />
))}
```

The selected `styleId` is stored in `VisualSettings.vinylStyle` and passed to `SongVinylOverlay` as `styleName`.

### Step 4 — Use the style

```tsx
<SongVinylOverlay
  styleName="retro"
  song={song}
  platform={platform}
  visible={visible}
  pageSessionId={pageSessionId}
/>
```

## Design Guidelines

- **Decorate, don't restructure** — Override colors, gradients, borders, and shadows under `.sd-vinyl-style-<name>`. Avoid changing `position`, `width`, or animation keyframes in style files.
- **Respect state classes** — Test with `--playing`, `--pending`, and `--interactive` modifiers.
- **Album-driven colors** — Prefer `var(--vinyl-color)` so cover art tinting works out of the box.
- **Preview component** — Use `VinylStylePreview` with the same `styleName` in pickers for consistent thumbnails.

## Package Development

```bash
pnpm --filter @spindeck/vinyl-ui dev    # Watch build
pnpm --filter @spindeck/vinyl-ui build  # Production build
pnpm --filter @spindeck/vinyl-ui lint   # Lint
```

CSS is exported via:

- `@spindeck/vinyl-ui/styles/base.css`
- `@spindeck/vinyl-ui/styles/<name>.css`

See also [Extending `@spindeck/ui`](./extending-ui) for app-wide theme families and the Material Contract.
