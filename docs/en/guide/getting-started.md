# Getting Started

SpinDeck is a cross-platform vinyl visualization player. It organizes playlists in your browser, displays them on a 3D album shelf, and controls playback in third-party music apps.

## Requirements

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) 9.x

## Install

```bash
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck
pnpm install
```

## Web Development

Start the dev server from the monorepo root:

```bash
pnpm dev
```

Or run only the web app:

```bash
pnpm --filter @spindeck/web dev
```

Open the local URL printed in your terminal.

## Build for Production

```bash
pnpm build
pnpm --filter @spindeck/web start
```

## Other Commands

```bash
pnpm lint          # Lint
pnpm check-types   # Type check
pnpm format        # Format code
```

See [Desktop App](./desktop) for the Tauri shell, or [Supported Platforms](./platforms) for music service compatibility.
