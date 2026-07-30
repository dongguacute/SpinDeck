---
title: Getting Started
weight: 10
---

# Getting Started

SpinDeck is a cross-platform vinyl visualization player. It organizes playlists in the UI, displays them on a 3D album shelf, and controls playback in third-party music apps.

**Architecture in one line:** SPA frontend (`apps/web`) + desktop-only Tauri shell (`apps/desktop`). See [Architecture](./architecture) for the diagram and IPC list, [Performance & Visuals](./performance) for the 3D shelf / atmosphere policy, and [System Requirements](./system-requirements) for minimum / recommended specs.

## Requirements

Developer toolchain summary (Release end users do **not** need Node / Rust):

- [Node.js](https://nodejs.org/) ≥ 22.13 (web / docs development and frontend builds)
- [pnpm](https://pnpm.io/) 11.x
- [Rust](https://rustup.rs/) (stable) — required for desktop (Tauri)

Full OS / hardware / WebView matrix: [System Requirements](./system-requirements).

## Install

```bash
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck
pnpm install
```

## Recommended: Desktop Development

For the full experience (import + playback + native window):

```bash
pnpm --filter @spindeck/desktop dev
```

Tauri starts the web Vite server and loads it in the WebView. Desktop features use `invoke`.

## Web Development (UI only)

Start the SPA from the monorepo root:

```bash
pnpm dev
```

Or run only the web app:

```bash
pnpm --filter @spindeck/web dev
```

Open the local URL printed in your terminal. Playlist import and playback require the desktop app — run desktop `dev` as above.

## Build Web SPA

```bash
pnpm --filter @spindeck/web build
```

Static output: `apps/web/build/client` (Tauri `frontendDist` for the desktop app).

## Other Commands

```bash
pnpm lint          # ESLint + desktop Rust fmt/clippy
pnpm check-types   # Type check
pnpm format        # Format code
pnpm dev:docs      # Documentation site
```

See [System Requirements](./system-requirements) for minimum / recommended specs, [Desktop App](./desktop) for packaging and install troubleshooting, [Architecture](./architecture) for module layout, [Performance & Visuals](./performance) for shelf memory policy, or [Supported Platforms](./platforms) for music service compatibility.

## Extending the UI

- [Extending `@spindeck/ui`](./extending-ui) — Theme families and the Material Contract
- [Extending `@spindeck/vinyl-ui`](./extending-vinyl-ui) — Vinyl player visual styles
