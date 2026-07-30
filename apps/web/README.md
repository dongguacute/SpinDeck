# `@spindeck/web`

SpinDeck SPA frontend (React Router, `ssr: false`).

## Role

- Playlist UI, 3D shelf, vinyl tonearm overlay, settings, and i18n
- In the desktop app, talks to Rust via Tauri `invoke` and `cover://`
- Does **not** implement playlist import or local player control — those live in `apps/desktop`

## Commands

From the monorepo root:

```bash
pnpm --filter @spindeck/web dev
pnpm --filter @spindeck/web build
pnpm --filter @spindeck/web lint
```

- **Dev**: Vite on `http://localhost:5173`
- **Build**: static output at `apps/web/build/client` (Tauri `frontendDist`)

## Layout

| Path | Notes |
| --- | --- |
| `app/` | Routes, components, hooks |
| `app/components/PlaylistShelf.tsx` | Three.js shelf (viewport window + playback cull) |
| `app/locales/{lang}/common.json` | i18n strings (no hardcoded UI copy) |
| `app/assets/` | Source assets (icons, images) |
| `app/lib/` | Client helpers (`import-api`, theme, playlist store, logger, …) |

Do not put editable source assets or translation files under `public/`.

## Shelf performance (short)

- **Browse**: mount meshes/covers near the scroll center only
- **Playback (settled)**: keep only the selected book in 3D; vinyl + backdrop atmosphere stay
- **Idle**: lower draw rate when the scene is settled; full rate during interaction/animation
- **Leave route**: dispose WebGL and force context loss

Product policy (atmosphere over legacy-device memory cuts): [Performance & Visuals](../../docs/en/guide/performance.md) / [性能与观感](../../docs/zh/guide/performance.md).

## Full experience

Run the desktop app:

```bash
pnpm --filter @spindeck/desktop dev
```

Browser-only mode is for UI preview; import and playback require the desktop shell.
