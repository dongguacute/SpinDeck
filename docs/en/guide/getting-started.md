---
title: Getting Started
weight: 10
---

# Getting Started

SpinDeck is a cross-platform vinyl visualization player. It organizes playlists in the UI, displays them on a 3D album shelf, and controls playback in third-party music apps.

**Architecture in one line:** SPA frontend (`apps/web`) + desktop-only Rust local API (`apps/desktop`). See [Architecture](./architecture) for the full diagram and `/api` list.

## Requirements

- [Node.js](https://nodejs.org/) ≥ 18 (web / docs development and frontend builds)
- [pnpm](https://pnpm.io/) 9.x
- [Rust](https://rustup.rs/) (stable) — required for desktop (Tauri) and the local `/api` server

## Install

```bash
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck
pnpm install
```

## Recommended: Desktop Development

For the full experience (import + playback APIs + native window):

```bash
pnpm --filter @spindeck/desktop dev
```

Tauri starts the web Vite server and the Rust API on `:17345`. Vite proxies `/api` to that port.

## Web Development (UI only)

Start the SPA from the monorepo root:

```bash
pnpm dev
```

Or run only the web app:

```bash
pnpm --filter @spindeck/web dev
```

Open the local URL printed in your terminal. Vite proxies `/api` to `127.0.0.1:17345`. Playlist import and playback need the Rust server — run desktop `dev` as above (or alongside web).

## Build Web SPA

```bash
pnpm --filter @spindeck/web build
```

Static output: `apps/web/build/client` (consumed by the desktop bundle).

## Other Commands

```bash
pnpm lint          # ESLint + desktop Rust fmt/clippy
pnpm check-types   # Type check
pnpm format        # Format code
pnpm dev:docs      # Documentation site
```

See [Desktop App](./desktop) for packaging and install troubleshooting, [Architecture](./architecture) for module layout, or [Supported Platforms](./platforms) for music service compatibility.

## Extending the UI

- [Extending `@spindeck/ui`](./extending-ui) — Theme families and the Material Contract
- [Extending `@spindeck/vinyl-ui`](./extending-vinyl-ui) — Vinyl player visual styles
