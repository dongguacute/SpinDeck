<p align="center">
  <img src="public/SpinDeckLogo.svg" alt="SpinDeck logo" width="72" height="72" />
</p>

<h1 align="center">SpinDeck</h1>

<p align="center"><strong>Cross-platform vinyl visualization player</strong> — organize playlists in your browser, browse a 3D album shelf, and sync playback with your local music apps through an interactive tonearm UI.</p>

<p align="center"><em>SpinDeck does not stream or host any audio. All music is played by third-party apps; this project handles playlist management and playback control only.</em></p>

## Preview

![SpinDeck playback view — vinyl tonearm UI with album cover and playback controls](public/Xnip2026-06-27_22-10-36.jpg)

The screenshot shows SpinDeck’s playback screen: a translucent vinyl record and draggable tonearm overlay the album artwork, with a soft background tinted from the cover colors. Track info appears on the disc label; **Exit Playback**, visual settings, and previous/next controls sit around the edges.

> **Screenshot copyright notice**  
> The album artwork (*1989 (Taylor's Version)*) and song title (*Style (Taylor's Version)*) shown in the preview belong to **Taylor Swift** and their respective copyright holders (including Republic Records). They are used here **solely for demonstration** of SpinDeck’s UI and are **not** hosted, distributed, or licensed by this project. SpinDeck does not claim any rights to this content.

---

## What It Does

### Playlist Management

- Create, edit, and bulk-delete playlists; data is stored locally in your browser
- Import playlists from **QQ Music**, **NetEase Cloud Music**, or **Kugou Music** via share links (up to 300 tracks per import)
- Manually create playlists (metadata only, no track list)
- Auto-refresh imported playlists every 5 / 15 / 30 minutes or 1 hour to stay in sync with the source

### 3D Playlist Shelf

- A Three.js-rendered 3D shelf displays album artwork
- Tap a record to play; skip tracks with previous/next controls or swipe gestures
- Dynamic backgrounds derived from cover art; upload a custom background and adjust blur

### Vinyl Tonearm

- Drag the tonearm to **drop the needle (play) or lift it (pause)** — tactile, turntable-like interaction
- Choose between classic and modern disc styles
- Playback state stays in sync with the connected music app (where supported)

### Appearance & Language

- Light, dark, or system appearance modes
- UI available in **English** and **Simplified Chinese**

---

## Typical Workflow

1. Open SpinDeck, create a playlist, and paste a share link from a supported platform
2. Once import finishes, open the **playlist shelf** to browse album covers
3. Select a track — the tonearm UI appears; dropping the needle triggers playback in your local music app
4. Adjust theme, language, and visual preferences in Settings

---

## Supported Music Platforms

Development status varies by platform. Only **QQ Music** is fully supported end to end.

| Platform | Playlist Import | Playback Control | Status |
|----------|:-----------------:|:----------------:|--------|
| **QQ Music** | ✅ | ✅ | **Fully supported** — import and playback control |
| **NetEase Cloud Music** | ✅ | Desktop only | Import works; playback control is limited to **desktop** (macOS / Windows) |
| **Kugou Music** | ✅ | — | **Import only** — playback control is not available due to technical limitations |
| **Apple Music** | — | — | Not implemented |
| **Spotify** | — | — | Not implemented |
| **YouTube Music** | — | — | Not implemented |

> **Notes**
>
> - **QQ Music** is the most complete integration: playlist import, playback control, and cross-device deep links.
> - **NetEase Cloud Music** supports playlist import everywhere, but tonearm playback sync works on desktop only — not on mobile.
> - **Kugou Music** playlists can be imported for browsing in SpinDeck, but there is no reliable way to control the Kugou app from SpinDeck.
> - Apple Music, Spotify, and YouTube Music appear in the UI for future use but have **no working integration** yet.

---

## Runtime

SpinDeck can run in a **browser** or as a **Tauri desktop app** (recommended on macOS for full playback control).

| Environment | Notes |
|-------------|-------|
| Browser | Any modern browser (Chrome, Safari, Firefox, Edge, etc.) — requires a local Node server for API routes (`pnpm --filter @spindeck/web dev` or `start`) |
| **Desktop (Tauri)** | macOS / Windows / Linux native window; bundles the web UI and starts an embedded local server in release builds |
| Desktop (macOS / Windows) | Full experience for QQ Music; NetEase playback control also available here |
| Mobile (iOS / Android) | QQ Music playback via deep links; NetEase playback control not supported |

---

## Quick Start

### Requirements

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) 9.x

### Local Development (Web)

```bash
# Clone the repository
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open the local URL printed in your terminal.

### Desktop App (Tauri)

Additional requirements for building the desktop shell:

- [Rust](https://rustup.rs/) (stable)
- Platform toolchain (e.g. Xcode Command Line Tools on macOS)

**Development** — Tauri loads the web dev server:

```bash
pnpm --filter @spindeck/desktop dev
```

This runs `@spindeck/web` dev and opens the SpinDeck window. App icon matches `apps/web/app/assets/icons/SpinDeckLogo.svg`.

**Production build** — packages the web build and embedded Node runtime:

```bash
pnpm --filter @spindeck/desktop build
```

Output: `apps/desktop/src-tauri/target/release/bundle/` (`.app` on macOS, `.msi` / `.exe` on Windows, etc.).

Release builds currently require **Node.js** on the user’s machine to run the embedded server. Regenerate desktop icons after logo changes (edit `apps/desktop/assets/app-icon.svg`, which includes macOS safe-area padding):

```bash
pnpm desktop:icons
```

### Build & Production (Web only)

```bash
pnpm build
pnpm --filter @spindeck/web start
```

### Other Commands

```bash
pnpm lint          # Lint
pnpm check-types   # Type check
pnpm format        # Format code
```

---

## Project Structure

This repo is a pnpm + Turborepo monorepo:

| Path | Description |
|------|-------------|
| [`apps/web`](apps/web) | SpinDeck web application |
| [`apps/desktop`](apps/desktop) | Tauri 2 desktop shell (`src-tauri/` lives here) |
| [`packages/core`](packages/core) | Core logic (playlist fetching, etc.) |
| [`packages/player`](packages/player) | Third-party music app control & deep links |
| [`packages/vinyl-ui`](packages/vinyl-ui) | Vinyl tonearm UI components |
| [`packages/ui`](packages/ui) | Shared UI components & themes |
| [`packages/picker`](packages/picker) | Cover art color extraction & backgrounds |

Each package has its own README with more detail.

---

## Disclaimer

- This project is **for personal learning and technical exchange only** — not for commercial use.
- All media content and data come from third-party services. SpinDeck **does not host or store** any copyrighted music files.
- Please comply with each music platform's terms of service and applicable laws when using this project.

---

## License

Licensed under the [Apache License 2.0](LICENSE).

---

## Links

- **Repository**: <https://github.com/dongguacute/SpinDeck>
- **Issues**: <https://github.com/dongguacute/SpinDeck/issues>
- **Author**: Cherry Fu · [@dongguacute](https://github.com/dongguacute)
