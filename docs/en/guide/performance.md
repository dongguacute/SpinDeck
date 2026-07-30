---
title: Performance & Visuals
weight: 17
---

# Performance & Visuals

SpinDeck’s desktop experience **prioritizes atmosphere and visual quality**. It targets modern hardware (Retina displays, capable GPUs) for a fluid 3D shelf and playback mood—not older devices at the cost of look and feel. Memory and GPU use will vary with the WebView, WebGL, and fullscreen compositing layers; that is expected.

## Design principles

| Principle | Meaning |
| --- | --- |
| Visuals first | Keep fullscreen backdrop blur, glass, vinyl glow, antialiasing, and similar mood effects by default |
| Cull off-screen, keep on-screen | Free GPU resources the user cannot see; do not deliberately degrade the visible frame |
| Measure release builds | Profile **packaged desktop** builds; Vite `localhost` dev adds overhead |
| WebView is the bottleneck | The Tauri/Rust shell is small; resident memory is dominated by the system WebView (WebContent / GPU) and the frontend scene |

## 3D shelf strategy

Most of this lives in `apps/web/app/components/PlaylistShelf.tsx`.

### Browse mode (playlist shelf)

- **Viewport window**: Meshes and cover/spine textures mount only near the scroll center; slots outside the window stay empty until needed.
- **Cover cap**: Oversized covers are downscaled before upload to the GPU so a single original cannot blow VRAM.
- **Idle frame throttle**: Full frame rate while dragging, coasting, or running GSAP; lower draw rate only when the scene is visually settled (the still frame itself is unchanged).

### Playback mode (selected cover + tonearm)

- **During the enter animation**: Neighboring books keep their textures so the slide-away motion stays complete.
- **After the animation settles**: Unload every other book’s mesh/textures and **keep only the selected cover** in 3D.
- **Track changes**: Immediately keep only the newly selected book.
- **Exit playback**: Silently remount the browse window, then run the slide-back animation (no pop-in that breaks the rhythm).

The vinyl layer (`@spindeck/vinyl-ui`) and playback backdrop (blurred cover, glass gradient) are separate DOM/CSS compositing and are **not** removed by shelf cull—they are part of the playback atmosphere.

### Leaving the route

When navigating away from the shelf, the WebGL renderer is disposed and `forceContextLoss()` is called so the GPU context can be released promptly.

## Numbers in Activity Monitor

On macOS, SpinDeck splits across processes (main, WebContent, GPU, Networking). “Memory” and “Graphics and Media” often come from different processes:

| Category | Rough meaning |
| --- | --- |
| Main process | Tauri/Rust shell — usually small |
| WebContent | JS heap, decoded images, WebGL-related resources (often the largest) |
| GPU / Graphics and Media | Compositor layers, IOSurfaces, WebGL framebuffers, etc. |

Tens of MB under Graphics with fullscreen WebGL plus CSS blur / `backdrop-filter` is normal and **not by itself a leak**. Compare optimizations in the same UI state (idle home / browsing shelf / playback) on a release build.

## What we deliberately skip

These would hurt atmosphere and are **not** the default path:

- Turning off realtime playback backdrop blur or fullscreen glass
- Crushing cover/spine textures until they look soft
- Globally disabling antialiasing or forcing very low resolution for legacy GPUs

If a future “power saver / low memory” mode appears, it should be optional—not the default.

## Related docs

- [Architecture](./architecture) — monorepo and IPC
- [System Requirements](./system-requirements) — OS / hardware floors
- [Desktop App](./desktop) — install, logs, and builds
- [`apps/web` README](https://github.com/dongguacute/SpinDeck/blob/main/apps/web/README.md) — SPA layout
