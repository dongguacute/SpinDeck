# @spindeck/eslint-config

Shared ESLint configurations for the SpinDeck monorepo.

## Configurations

This package provides two main configurations:

- `base`: Standard TypeScript configuration.
- `react`: Configuration for React projects, including hooks and accessibility rules.

## Installation

```bash
pnpm add -D @spindeck/eslint-config
```

## Usage

In your `eslint.config.js` or `eslint.config.ts`:

### Base TypeScript

```typescript
import { config } from "@spindeck/eslint-config/base";

export default [
  ...config,
  // Your custom rules here
];
```

### React

```typescript
import { config } from "@spindeck/eslint-config/react";

export default [
  ...config,
  // Your custom rules here
];
```

## Dependencies

This config relies on:
- `eslint` (v9+)
- `typescript-eslint`
- `eslint-plugin-react` (for React config)
- `eslint-plugin-react-hooks` (for React config)
