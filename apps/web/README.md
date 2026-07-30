# `@spindeck/web`

SpinDeck SPA frontend (React Router, `ssr: false`).

## Role

- Playlist UI, 3D shelf, vinyl tonearm overlay, settings, and i18n
- Talks to the desktop Rust API via same-origin `/api/*` (Vite proxy in development)
- Does **not** implement playlist import or local player control — those live in `apps/desktop`

## Commands

From the monorepo root:

```bash
pnpm --filter @spindeck/web dev
pnpm --filter @spindeck/web build
pnpm --filter @spindeck/web lint
```

- **Dev**: Vite on `http://localhost:5173`, proxies `/api` → `127.0.0.1:17345`
- **Build**: static output at `apps/web/build/client` (copied into the desktop bundle)

## Layout

| Path | Notes |
| --- | --- |
| `app/` | Routes, components, hooks |
| `app/locales/{lang}/common.json` | i18n strings (no hardcoded UI copy) |
| `app/assets/` | Source assets (icons, images) |
| `app/lib/` | Client helpers (`import-api`, theme, playlist store, …) |

Do not put editable source assets or translation files under `public/`.

## Full experience

Run the desktop app so the Rust server is available:

```bash
pnpm --filter @spindeck/desktop dev
```

See the root [README](../../README.md) and [Architecture](../../docs/en/guide/architecture.md) for the overall model.
