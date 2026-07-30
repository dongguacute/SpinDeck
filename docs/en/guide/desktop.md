---
title: Desktop App
weight: 20
---

# Desktop App

SpinDeck ships a [Tauri 2](https://v2.tauri.app/) desktop shell for macOS, Windows, and Linux. The desktop build loads the web SPA in a native WebView and exposes playlist import / playback via Tauri `invoke` and `cover://` — recommended on macOS for full playback control.

## Architecture (desktop)

| Piece | Responsibility |
| --- | --- |
| Tauri WebView | Hosts the SPA (`frontendDist` / Vite in dev) |
| Rust `commands/` | `invoke` handlers for import and playback |
| Rust `cover` | `cover://` cover-art proxy |
| Rust `playlist/` | QQ / NetEase / Kugou import providers |
| Rust `playback/` | Local music-app control (macOS AppleScript / `open`) |

See [Architecture](./architecture) for the monorepo diagram and IPC table. App package notes: [`apps/desktop/README.md`](https://github.com/dongguacute/SpinDeck/blob/main/apps/desktop/README.md).

## Download

Download pre-built desktop installers from GitHub Releases:

**[v1.0.0-beta.6](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.6)** (latest)

Pick the asset for your platform (`.dmg` / `.app` on macOS, `.msi` / `.exe` on Windows, etc.). Release builds bundle the SPA and Rust desktop features — **Node.js is no longer required** on the user's machine.

### What's new in v1.0.0-beta.6

- **Embedded Rust capabilities** — Playlist import, cover proxy, and playback control run in the desktop Rust runtime via Tauri `invoke` / `cover://`
- **Node SSR removed** — Drops web/desktop Node API routes and `@spindeck/core`; full desktop builds no longer need Node.js on the user's machine
- **Viewport-based 3D shelf loading** — Loads 3D assets by viewport visibility to cut initial cost and memory use
- **Docs & tooling** — Syncs architecture/dev docs; updates lint-staged, `.gitignore`, and repository cleanup rules

Previous release: [v1.0.0-beta.5](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.5)

::: warning Unavailable releases
The following builds are **not recommended** due to a white-screen issue in packaged desktop apps:

- [v1.0.0-beta.2](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.2) — Unavailable
- [v1.0.0-beta.1](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.1) — Unavailable
:::

## Installation & Common Issues

SpinDeck desktop builds are **not yet signed** with Apple or Microsoft certificates. You may hit platform-specific issues when installing or opening the app for the first time.

### All platforms

| Symptom | Cause | What to do |
|---------|-------|------------|
| White screen or immediate quit | WebView / frontend assets failed to load | Relaunch; if it persists, check the log paths below |

**Log locations (when startup fails):**

- **macOS**: `~/Library/Logs/com.spindeck.app/`
- **Windows**: `%LOCALAPPDATA%\com.spindeck.app\logs\`
- **Linux**: `~/.local/share/com.spindeck.app/logs/` (may vary by distro)

### macOS

macOS applies the strictest restrictions to unsigned apps. **Most “can’t open / can’t install” reports come from macOS.**

| Symptom | Cause | What to do |
|---------|-------|------------|
| “SpinDeck cannot be opened because Apple cannot check it for malicious software” | Gatekeeper blocking an unsigned app | **Option A**: Right-click (or Control-click) `SpinDeck.app` → **Open** → click **Open** again in the dialog.<br>**Option B**: **System Settings → Privacy & Security** → find the blocked app notice → **Open Anyway** |
| “SpinDeck is damaged and can’t be opened. You should move it to the Trash” | Download quarantine attribute (`com.apple.quarantine`) | In Terminal (replace the path with your actual `.app` location):<br>`xattr -cr /Applications/SpinDeck.app`<br>Then right-click → **Open** again |
| Double-clicking inside the DMG does nothing useful | App was not copied to Applications | Drag `SpinDeck.app` into **Applications**, then launch from Launchpad or the Applications folder |
| Wrong architecture | Build does not match your Mac | Apple Silicon (M-series): use the **macos-arm** asset; Intel Macs: use **macos-intel** |

#### macOS Accessibility permission (pause/resume)

SpinDeck controls local music clients (QQ Music, NetEase, etc.) on macOS via AppleScript for pause/resume, which requires the **Accessibility** permission. **Play-only** (URL scheme) does not need it, but **pause / resume** must be authorized.

| Symptom | Cause | What to do |
|---------|-------|------------|
| Clicking pause does nothing and the app prompts for Accessibility | SpinDeck lacks Accessibility permission | Open **System Settings → Privacy & Security → Accessibility** and toggle **SpinDeck** on |
| Toggle is on but the prompt still appears | TCC database did not refresh (occasional macOS issue) | Toggle off and back on; or remove SpinDeck with **「–」**, restart the app, and re-authorize |
| Pause turns into play (clicking pause while nothing is playing) | Old versions' space-key fallback triggers play when idle | Upgrade to v1.0.0-beta.5 or later; the new build checks playback state before sending pause |
| Works in dev, fails in packaged build | The packaged `.app` has a different signing/permission context than dev | Re-grant Accessibility permission to the `SpinDeck.app` installed in `/Applications` |

**Authorization steps:**

1. On first pause click, the app shows a prompt and opens **System Settings → Privacy & Security → Accessibility**
2. Find **SpinDeck** in the list and toggle it on
3. Return to the app and click pause again

::: tip Permission not taking effect?
If the toggle is on but the prompt still appears, try: **System Settings → Privacy & Security → Accessibility** → select SpinDeck → click **「–」** to remove → restart SpinDeck → authorize again when prompted. This is a known occasional issue with the macOS TCC database.
:::

::: tip
If the app still won’t open, do not run it directly from the mounted DMG. Copy it to **Applications** first, then follow the Gatekeeper steps above.
:::

### Windows

| Symptom | Cause | What to do |
|---------|-------|------------|
| SmartScreen: “Windows protected your PC” | Installer is not EV-signed | Click **More info** → **Run anyway** |
| Blocked by antivirus | Unsigned desktop binary / WebView process | Add the SpinDeck install folder or `.exe` to your allowlist |

### Linux

| Symptom | Cause | What to do |
|---------|-------|------------|
| AppImage won’t run | Missing execute permission | `chmod +x spindeck-*.AppImage`, then run it |
| AppImage FUSE error | FUSE not installed | Ubuntu/Debian: `sudo apt install libfuse2`; or use the `.deb` package instead |
| `.deb` missing dependencies | WebKit / graphics libraries | Install WebKit GTK and related packages (see build-from-source Linux deps) |

## Build from Source

### Additional Requirements

- [Rust](https://rustup.rs/) (stable)
- Platform toolchain (e.g. Xcode Command Line Tools on macOS)

### Development

Tauri starts the web Vite server and loads it in the WebView. Desktop features use Tauri `invoke`:

```bash
pnpm --filter @spindeck/desktop dev
```

This runs `@spindeck/web` and opens the SpinDeck window.

### Production Build

```bash
pnpm --filter @spindeck/desktop build
```

Builds the SPA into Tauri `frontendDist`, then runs `tauri build`. The packaged app loads the SPA via Tauri’s native asset protocol and uses `invoke` / `cover://` for desktop features — **no Node.js on the user’s machine**.

Output is written to `apps/desktop/src-tauri/target/release/bundle/` (`.app` on macOS, `.msi` / `.exe` on Windows, etc.).

### Icons

Desktop icons are generated from `apps/web/app/assets/icons/SpinDeckLogo.svg`. Regenerate after logo changes:

```bash
pnpm desktop:icons
```
