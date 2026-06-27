---
title: Desktop App
weight: 20
---

# Desktop App

SpinDeck ships a [Tauri 2](https://v2.tauri.app/) desktop shell for macOS, Windows, and Linux. The desktop build bundles the web UI and is recommended on macOS for full playback control.

## Download

Download pre-built desktop installers from GitHub Releases:

**[v1.0.0-beta.2](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.2)**

Pick the asset for your platform (`.dmg` / `.app` on macOS, `.msi` / `.exe` on Windows, etc.). Release builds currently require **Node.js** on the user's machine to run the embedded server.

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
