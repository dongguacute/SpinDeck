# `@spindeck/picker`

Lightweight cover-art color helpers for SpinDeck theming (edge midpoints and left-column gradients).

## Features

- **Edge colors** — sample top / bottom / left / right midpoints
- **Left column** — full vertical column for spine / gradient UIs
- **Downsampled sampling** — draws to a small canvas before reading pixels (keeps memory low on large covers)

## Installation

```bash
pnpm add @spindeck/picker --filter @spindeck/web
```

## Usage

```typescript
import { pickEdgeColors, pickLeftColumnColors } from "@spindeck/picker";

const edges = await pickEdgeColors({ content: imageUrlOrDataUrl });
const column = await pickLeftColumnColors({ content: imageUrlOrDataUrl });
```

`content` accepts a normal image URL (use the desktop `/api/image` proxy when CORS matters) or a data URL.

## Development

```bash
pnpm --filter @spindeck/picker build
pnpm --filter @spindeck/picker lint
```
