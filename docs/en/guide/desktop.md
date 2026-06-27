---
title: Desktop App
weight: 20
---

# Desktop App

SpinDeck ships a [Tauri 2](https://v2.tauri.app/) desktop shell for macOS, Windows, and Linux. The desktop build bundles the web UI and is recommended on macOS for full playback control.

## Download

Download pre-built desktop installers from GitHub Releases:

**[v1.0.0-beta.3](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.3)** (latest)

Pick the asset for your platform (`.dmg` / `.app` on macOS, `.msi` / `.exe` on Windows, etc.). Release builds currently require **Node.js** on the user's machine to run the embedded server.

::: warning Unavailable releases
The following builds are **not recommended** due to a white-screen issue in packaged desktop apps:

- [v1.0.0-beta.2](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.2) — Unavailable
- [v1.0.0-beta.1](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.1) — Unavailable
:::

## Installation & Common Issues

SpinDeck desktop builds are **not yet signed** with Apple or Microsoft certificates, and they require **Node.js** on your machine to run the embedded local server. You may hit platform-specific issues when installing or opening the app for the first time.

### All platforms

| Symptom | Cause | What to do |
|---------|-------|------------|
| White screen or immediate quit | Node.js missing, or embedded server failed to start | Install [Node.js 20+](https://nodejs.org/) and relaunch; if it persists, check the log paths below |
| `node` not found | GUI apps on some systems have a minimal `PATH` | Ensure Node is installed; on macOS, Homebrew is recommended (see below) |

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

**Recommended Node.js install (macOS):**

```bash
# Homebrew
brew install node
```

Verify with `node -v` (20 or newer).

::: tip
If the app still won’t open, do not run it directly from the mounted DMG. Copy it to **Applications** first, then follow the Gatekeeper steps above.
:::

### Windows

| Symptom | Cause | What to do |
|---------|-------|------------|
| SmartScreen: “Windows protected your PC” | Installer is not EV-signed | Click **More info** → **Run anyway** |
| App won’t start after install | Node.js not installed | Install LTS from [nodejs.org](https://nodejs.org/); enable **Add to PATH** during setup, then restart SpinDeck |
| Blocked by antivirus | The app spawns a local Node.js server process | Add the SpinDeck install folder or `.exe` to your allowlist |

### Linux

| Symptom | Cause | What to do |
|---------|-------|------------|
| AppImage won’t run | Missing execute permission | `chmod +x spindeck-*.AppImage`, then run it |
| AppImage FUSE error | FUSE not installed | Ubuntu/Debian: `sudo apt install libfuse2`; or use the `.deb` package instead |
| `.deb` missing dependencies | WebKit / graphics libraries | Install WebKit GTK and related packages (see build-from-source Linux deps) |
| White screen after launch | Node.js not installed | Install Node.js 20+ via your package manager or [nvm](https://github.com/nvm-sh/nvm) |

## Build from Source

### Additional Requirements

- [Rust](https://rustup.rs/) (stable)
- Platform toolchain (e.g. Xcode Command Line Tools on macOS)

### Development

Tauri loads the web dev server during development:

```bash
pnpm --filter @spindeck/desktop dev
```

This runs `@spindeck/web` dev and opens the SpinDeck window.

### Production Build

```bash
pnpm --filter @spindeck/desktop build
```

Output is written to `apps/desktop/src-tauri/target/release/bundle/` (`.app` on macOS, `.msi` / `.exe` on Windows, etc.).

### Icons

Desktop icons are generated from `apps/web/app/assets/icons/SpinDeckLogo.svg`. Regenerate after logo changes:

```bash
pnpm desktop:icons
```
