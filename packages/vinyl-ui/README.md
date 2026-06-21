# @spindeck/vinyl-ui

A modular, interactive vinyl record player UI component library for the SpinDeck project.

## Features

- **Interactive Tonearm**: Drag-and-drop tonearm to control playback.
- **Visual Feedback**: Real-time spinning animation and glowing effects synced with playback status.
- **Adaptive Layout**: Automatically calculates optimal size and position based on viewport.
- **Extensible Styling**: CSS-based style inheritance system for easy creation of new visual themes.

## Installation

This package is part of the SpinDeck monorepo. To use it in another workspace package:

```json
{
  "dependencies": {
    "@spindeck/vinyl-ui": "workspace:*"
  }
}
```

## Usage

### 1. Import Styles

You must import the base styles and at least one theme style in your global CSS or main entry point:

```css
/* Import base structure and animations */
@import "@spindeck/vinyl-ui/src/styles/base.css";

/* Import specific theme styles */
@import "@spindeck/vinyl-ui/src/styles/classic.css";
```

### 2. Use the Component

```tsx
import { SongVinylOverlay } from "@spindeck/vinyl-ui";

function PlayerPage() {
  return (
    <SongVinylOverlay
      song={currentSong}
      platform="QQMusic"
      visible={true}
      pageSessionId="unique-session-id"
      styleName="classic" // Matches .sd-vinyl-style-classic
    />
  );
}
```

## Component Props

### `SongVinylOverlay`

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `song` | `SongInfo` | Required | Metadata of the song (name, artist, cover). |
| `platform` | `PlatformType` | Required | Music platform for playback control. |
| `visible` | `boolean` | Required | Controls visibility and entry animations. |
| `pageSessionId` | `string` | Required | Unique ID to track the current page session. |
| `theme` | `"dark" \| "light"` | `"dark"` | System theme for color derivation. |
| `styleName` | `string` | `"classic"` | The CSS style class to apply (`sd-vinyl-style-${styleName}`). |
| `tonearmPortalRef` | `RefObject` | `undefined` | Optional ref for portaling the tonearm to a different layer. |

## Customizing Styles

The library uses a "Base + Theme" CSS architecture. To contribute a new style:

1.  **Create a new CSS file** (e.g., `retro.css`).
2.  **Use the style class** to override or add decorations:

```css
/* retro.css */
.sd-vinyl-style-retro .sd-vinyl-disc {
  background: linear-gradient(...);
  border: 4px solid #f0e;
}

.sd-vinyl-style-retro .sd-vinyl-center {
  background: #333;
}
```

3.  **Apply the style** by passing the name to the component:

```tsx
<SongVinylOverlay styleName="retro" ... />
```

## License

MIT
