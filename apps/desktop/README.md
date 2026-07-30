# `@spindeck/desktop`

Tauri 2 desktop shell for SpinDeck (macOS / Windows / Linux).

## Role

- Native window + WebView hosting the web SPA
- Embedded **Rust** HTTP server on `127.0.0.1:17345`
  - Static SPA in production
  - `/api/*` for playlist import, image proxy, and local playback control
- Release builds do **not** require Node.js on the user’s machine

## Commands

```bash
pnpm --filter @spindeck/desktop dev      # Tauri + Vite + Rust API
pnpm --filter @spindeck/desktop build    # SPA → resources/web → tauri build
pnpm --filter @spindeck/desktop lint     # cargo fmt --check + clippy -D warnings
pnpm desktop:icons                        # regenerate icons from SpinDeckLogo.svg
```

## Rust layout (`src-tauri/src`)

| Module | Responsibility |
| --- | --- |
| `app/` | Tauri shell, window, accessibility helpers |
| `server/` | HTTP lifecycle, port bind, SPA static files |
| `api/` | `/api/*` route handlers |
| `playlist/` | QQ / NetEase / Kugou import providers + cache |
| `playback/` | Local music-app control (macOS AppleScript / `open`) |
| `util/` | Shared HTTP / HTML helpers |
| `types.rs` | Request / response DTOs |

## Notes

- Tauri project lives only under `apps/desktop/src-tauri` — never create a root-level `src-tauri`
- `src-tauri/resources/` and `apps/desktop/.cache/` are build artifacts — do not commit
- Pre-commit runs this package’s Rust lint when `*.rs` / `*.toml` under `src-tauri` are staged

See [Desktop guide](../../docs/en/guide/desktop.md) and [Architecture](../../docs/en/guide/architecture.md).
