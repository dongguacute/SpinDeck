<p align="center">
  <img src="public/SpinDeckLogo.svg" alt="SpinDeck logo" width="72" height="72" />
</p>

<h1 align="center">SpinDeck 🎵</h1>

<p align="center"><strong>Cross-platform vinyl visualization player</strong> — organize playlists in your browser, browse a 3D album shelf, and sync playback with your local music apps through an interactive tonearm UI.</p>

<p align="center"><em>SpinDeck doesn't stream or host any audio. Your music apps handle playback; we handle playlists and control.</em></p>

<p align="center"><a href="https://spindeck.dgct.cc">📖 Official Documentation</a></p>

---

## 👀 Preview

![SpinDeck playback view — vinyl tonearm UI with album cover and playback controls](public/Xnip2026-06-27_22-10-36.jpg)

This is SpinDeck's playback screen: a translucent vinyl record and draggable tonearm over the album art, with a soft background tinted from the cover. Track info sits on the disc label; **Exit Playback**, visual settings, and prev/next controls ring the edges.

> **📸 Screenshot copyright notice**  
> The album artwork (*1989 (Taylor's Version)*) and song title (*Style (Taylor's Version)*) shown in the preview belong to **Taylor Swift** and their respective copyright holders (including Republic Records). They are used here **solely for demonstration** of SpinDeck's UI and are **not** hosted, distributed, or licensed by this project. SpinDeck does not claim any rights to this content.

---

## ✨ What It Does

### 📋 Playlist Management

- Create, edit, and bulk-delete playlists — everything stays local in your browser
- Import playlists from **QQ Music**, **NetEase Cloud Music**, or **Kugou Music** via share links (up to 300 tracks per import)
- Manually create playlists (metadata only, no track list)
- Auto-refresh imported playlists every 5 / 15 / 30 minutes or 1 hour to stay in sync with the source

### 🗄️ 3D Playlist Shelf

- A Three.js-rendered 3D shelf — flip through album covers like a real rack
- Tap a record to play; skip tracks with prev/next controls or swipe gestures
- Dynamic backgrounds from cover art; upload a custom background and tweak blur

### 🎛️ Vinyl Tonearm

- Drag the tonearm to **drop the needle (play) or lift it (pause)** — tactile, turntable-like interaction
- Classic or modern disc styles
- Playback state syncs with your connected music app (where the platform supports it)

### 🎨 Appearance & Language

- Light, dark, or follow system
- UI in **English** and **Simplified Chinese**

---

## 🚀 Typical Workflow

1. Open SpinDeck, create a playlist, paste a share link from a supported platform
2. Once import finishes, open the **playlist shelf** and browse the covers
3. Pick a track — the tonearm UI appears; drop the needle and your local music app starts playing
4. Tweak theme, language, and visuals in Settings

That's it. No account, no cloud upload — just your playlists and your player.

---

## 🎧 Supported Music Platforms

Progress varies by platform. Only **QQ Music** is fully supported end to end today.

| Platform | Playlist Import | Playback Control | Status |
|----------|:-----------------:|:----------------:|--------|
| **QQ Music** | ✅ | ✅ | **Fully supported** — import + playback control |
| **NetEase Cloud Music** | ✅ | Desktop only | Import works; playback control on **desktop** (macOS / Windows) |
| **Kugou Music** | ✅ | — | **Import only** — no playback control (technical limitations) |
| **Apple Music** | — | — | Not implemented yet |
| **Spotify** | — | — | Not implemented yet |
| **YouTube Music** | — | — | Not implemented yet |

> **💡 Notes**
>
> - **QQ Music** is the most complete: playlist import, playback control, and cross-device deep links.
> - **NetEase Cloud Music** — import everywhere, but tonearm playback sync is **desktop only** (not mobile).
> - **Kugou Music** — import for browsing in SpinDeck, but no reliable way to control the Kugou app from here.
> - Apple Music, Spotify, and YouTube Music show up in the UI for future use — **no working integration yet**.

---

## 💻 Runtime

Run SpinDeck in a **browser** or as a **Tauri desktop app** (recommended on macOS for the full playback-control experience).

| Environment | Notes |
|-------------|-------|
| Browser | Any modern browser (Chrome, Safari, Firefox, Edge, etc.) — needs a local Node server for API routes (`pnpm --filter @spindeck/web dev` or `start`) |
| **Desktop (Tauri)** | macOS / Windows / Linux native window; release builds bundle the web UI and embedded local server |
| Desktop (macOS / Windows) | Full QQ Music experience; NetEase playback control here too |
| Mobile (iOS / Android) | QQ Music via deep links; NetEase playback control not supported |

---

## 🛠️ Quick Start

### Requirements

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) 9.x

### Local Development (Web)

```bash
# Clone the repo
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open the local URL printed in your terminal.

### Desktop App (Tauri)

You'll also need:

- [Rust](https://rustup.rs/) (stable)
- Platform toolchain (e.g. Xcode Command Line Tools on macOS)

**Development** — Tauri loads the web dev server:

```bash
pnpm --filter @spindeck/desktop dev
```

Runs `@spindeck/web` dev and opens the SpinDeck window. App icon matches `apps/web/app/assets/icons/SpinDeckLogo.svg`.

**Production build** — packages the web build and embedded Node runtime:

```bash
pnpm --filter @spindeck/desktop build
```

Output: `apps/desktop/src-tauri/target/release/bundle/` (`.app` on macOS, `.msi` / `.exe` on Windows, etc.).

Release builds currently require **Node.js** on the user's machine for the embedded server. Regenerate desktop icons after logo changes (edit `apps/desktop/assets/app-icon.svg`, which includes macOS safe-area padding):

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

## 📁 Project Structure

pnpm + Turborepo monorepo:

| Path | Description |
|------|-------------|
| [`apps/web`](apps/web) | SpinDeck web app |
| [`apps/desktop`](apps/desktop) | Tauri 2 desktop shell (`src-tauri/` lives here) |
| [`packages/core`](packages/core) | Core logic (playlist fetching, etc.) |
| [`packages/player`](packages/player) | Third-party music app control & deep links |
| [`packages/vinyl-ui`](packages/vinyl-ui) | Vinyl tonearm UI components |
| [`packages/ui`](packages/ui) | Shared UI components & themes |
| [`packages/picker`](packages/picker) | Cover art color extraction & backgrounds |

Each package has its own README with more detail.

---

## ⚠️ Disclaimer

- This project is **for personal learning and technical exchange** — not for commercial use.
- All media content and data come from third-party services. SpinDeck **does not host or store** any copyrighted music files.
- Please comply with each music platform's terms of service and applicable laws when using this project.

---

## 📄 License

Licensed under the [Apache License 2.0](LICENSE).

---

## 🔗 Links

- **Documentation**: <https://spindeck.dgct.cc>
- **Repository**: <https://github.com/dongguacute/SpinDeck>
- **Issues**: <https://github.com/dongguacute/SpinDeck/issues>
- **Author**: Cherry Fu · [@dongguacute](https://github.com/dongguacute)

If SpinDeck is useful to you, a ⭐ on GitHub means a lot — thanks for stopping by!
