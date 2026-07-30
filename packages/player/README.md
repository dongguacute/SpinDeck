# `@spindeck/player`

Browser-side playback client for SpinDeck. It builds deep links / play URLs, tracks session state for the tonearm UI, and talks to the **desktop shell** through `setDesktopBridge` (Tauri `invoke`) when local control is available.

## Scope

| Included | Not included |
| --- | --- |
| Client helpers: `playSong`, `pauseSong`, `resumeSong`, `stopSong`, `getPlaybackStatus`, … | Server-side AppleScript / Node playback (moved to `apps/desktop` Rust) |
| Deep links & app pre-launch helpers | Playlist import (Rust `playlist/` providers) |
| Session / shelf session state | UI components (see `@spindeck/vinyl-ui`) |
| `setDesktopBridge` for Tauri IPC | HTTP `/api` endpoints (removed) |
| Shared client logger helpers | Desktop session log paths (see [Desktop guide](../../docs/en/guide/desktop.md)) |

Supported control depth still varies by platform — see the [Supported Platforms](../../docs/en/guide/platforms.md) guide. QQ Music is the most complete today; NetEase local control is desktop-oriented; Kugou is import-only at the product level.

## Installation

Inside the monorepo workspace (preferred):

```bash
pnpm add @spindeck/player --filter @spindeck/web
```

## Usage

```typescript
import {
  playSong,
  pauseSong,
  getPlaybackStatus,
  beginShelfSession,
  buildSongPlayUrls,
  setDesktopBridge,
} from "@spindeck/player";

// In the Tauri desktop app, wire invoke once at startup:
setDesktopBridge({
  playSong: (input) => invoke("play_song", input),
  pauseSong: (input) => invoke("pause_song", input),
  resumeSong: (input) => invoke("resume_song", input),
  playbackStatus: (input) => invoke("playback_status", input),
  setPlayMode: (input) => invoke("set_play_mode", input),
});

await beginShelfSession("QQMusic");

await playSong("QQMusic", {
  name: "Example",
  artist: "Artist",
  cover: "",
  album: "",
  platformSongId: "…",
});

const status = await getPlaybackStatus("QQMusic", song);
await pauseSong("QQMusic");

const urls = buildSongPlayUrls("QQMusic", song, "macos");
```

Configure native openers / accessibility hooks from the desktop shell when needed (`setAppUrlOpener`, `setAccessibilityMissingHandler`, …).

## Development

```bash
pnpm --filter @spindeck/player build
pnpm --filter @spindeck/player lint
```
