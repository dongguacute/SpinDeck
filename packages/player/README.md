# @spindeck/player

The core playback engine for SpinDeck, providing a unified interface for multiple music platforms.

## Features

- **Multi-platform Support**: Integrated support for:
  - Apple Music
  - QQ Music
  - Netease Cloud Music
  - Spotify
  - Kugou Music
- **Unified Playback Control**: Standardized commands for play, pause, resume, and stop across all platforms.
- **Session Management**: Track playback sessions and song states.
- **Deep Linking**: Support for platform-specific deep links and app pre-launching.
- **Client & Server Support**: Includes both browser-compatible client logic and Node.js-compatible server utilities.

## Installation

```bash
pnpm add @spindeck/player
```

## Usage

### Basic Playback

```typescript
import { playSong, pauseSong } from '@spindeck/player';

// Play a song on a specific platform
await playSong({
  platform: 'qqmusic',
  songId: '...',
  // ... other options
});

// Pause playback
await pauseSong();
```

### Platform-specific URLs

```typescript
import { buildSongPlayUrls } from '@spindeck/player';

const urls = buildSongPlayUrls(songInfo, 'spotify');
```

## Development

- `pnpm build`: Build the package.
- `pnpm dev`: Build with watch mode.
- `pnpm lint`: Lint the codebase.
