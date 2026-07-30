# SpinDeck Docs

Documentation site powered by [VitePress](https://vitepress.dev/).

Content mirrors the product architecture: **SPA frontend + Tauri desktop shell** (`invoke` / `cover://`). Start with:

- English: [Getting Started](./en/guide/getting-started.md) · [System Requirements](./en/guide/system-requirements.md) · [Architecture](./en/guide/architecture.md) · [Performance & Visuals](./en/guide/performance.md) · [Desktop](./en/guide/desktop.md)
- 简体中文：[快速开始](./zh/guide/getting-started.md) · [系统要求](./zh/guide/system-requirements.md) · [架构](./zh/guide/architecture.md) · [性能与观感](./zh/guide/performance.md) · [桌面应用](./zh/guide/desktop.md)

## Commands

From the repository root:

```bash
pnpm dev:docs      # Start dev server
pnpm build:docs    # Build static site
pnpm preview:docs  # Preview production build
```

Or from this package:

```bash
pnpm dev
pnpm build
pnpm preview
```

VitePress config: `.vitepress/config.mts`. Guide pages live under `en/guide/` and `zh/guide/` (sidebar is auto-generated and sorted by frontmatter `weight`).
