# @spindeck/core

Core utilities and shared logic for the SpinDeck project.

## Features

- **Music Platform Integration**: Utilities for fetching data from music platforms (e.g., QQ Music).
- **Input Handling**: Shared logic for processing user inputs and URLs.
- **Utilities**: Common helper functions like HTML entity decoding.
- **Type Definitions**: Shared TypeScript types used across the SpinDeck ecosystem.

## Installation

```bash
pnpm add @spindeck/core
```

## Usage

### Decoding HTML Entities

```typescript
import { decodeHtmlEntities } from '@spindeck/core';

const decoded = decodeHtmlEntities('Hello &amp; World');
// Output: "Hello & World"
```

### Fetching QQ Music List

```typescript
import { getQQMusicList } from '@spindeck/core';

const list = await getQQMusicList('playlist_id');
```

## Development

- `pnpm build`: Build the package using TypeScript.
- `pnpm test`: Run tests using Vitest.
- `pnpm lint`: Lint the codebase.
