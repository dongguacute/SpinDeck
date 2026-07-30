# `@spindeck/player`

Browser-side playback client for SpinDeck. It builds deep links / play URLs, tracks session state for the tonearm UI, and calls the **desktop Rust** `/api/*` endpoints when local control is available.

## Scope

| Included | Not included |
| --- | --- |
| Client helpers: `playSong`, `pauseSong`, `resumeSong`, `stopSong`, `getPlaybackStatus`, … | Server-side AppleScript / Node playback (moved to `apps/desktop` Rust) |
| Deep links & app pre-launch helpers | Playlist import (Rust `playlist/` providers) |
| Session / shelf session state | UI components (see `@spindeck/vinyl-ui`) |

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
} from "@spindeck/player";

await beginShelfSession({ platform: "QQMusic" });

await playSong({
  platform: "QQMusic",
  song: {
    name: "Example",
    artist: "Artist",
    cover: "",
    album: "",
    platformSongId: "…",
  },
});

const status = await getPlaybackStatus({ platform: "QQMusic" });
await pauseSong({ platform: "QQMusic" });

const urls = buildSongPlayUrls(songInfo, "QQMusic");
```

Configure native openers / accessibility hooks from the desktop shell when needed (`setAppUrlOpener`, `setAccessibilityMissingHandler`, …).

## Development

```bash
pnpm --filter @spindeck/player build
pnpm --filter @spindeck/player lint
```
