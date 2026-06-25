# @spindeck/picker

A utility package for extracting prominent colors from images, designed for dynamic UI theming in SpinDeck.

## Features

- **Edge Color Extraction**: Extract colors from the edges of an image.
- **Column Color Extraction**: Extract colors from the left column of an image.
- **Lightweight**: Minimal dependencies, focused on color processing.

## Installation

```bash
pnpm add @spindeck/picker
```

## Usage

```typescript
import { pickEdgeColors, pickLeftColumnColors } from '@spindeck/picker';

// Example: Extract colors from an image
const edgeColors = await pickEdgeColors(imageInput);
const leftColumnColors = await pickLeftColumnColors(imageInput);
```

## Development

- `pnpm build`: Build the package.
- `pnpm lint`: Lint the codebase.
