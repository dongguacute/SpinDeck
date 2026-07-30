# `@spindeck/desktop`

Tauri 2 desktop shell for SpinDeck (macOS / Windows / Linux).

## Role

- Native window + WebView hosting the web SPA (`frontendDist` / Vite `devUrl`)
- Tauri **invoke** IPC for playlist import and local playback control
- Custom `cover://` URI scheme for cover-art proxy (Referer + size limits)
- Release builds do **not** require Node.js on the user’s machine

## Commands

```bash
pnpm --filter @spindeck/desktop dev      # Tauri + Vite
pnpm --filter @spindeck/desktop build    # SPA → tauri build
pnpm --filter @spindeck/desktop lint     # cargo fmt --check + clippy -D warnings
pnpm desktop:icons                        # regenerate icons from SpinDeckLogo.svg
```

## Rust layout (`src-tauri/src`)

| Module | Responsibility |
| --- | --- |
| `app/` | Tauri shell, window, IPC registration |
| `commands/` | `invoke` handlers (import + playback) |
| `cover` | `cover://` cover-art proxy protocol |
| `playlist/` | QQ / NetEase / Kugou import providers + cache |
| `playback/` | Local music-app control (macOS AppleScript / `open`) |
| `util/` | Shared HTTP / HTML helpers |
| `types.rs` | DTOs |

## Notes

- Tauri project lives only under `apps/desktop/src-tauri` — never create a root-level `src-tauri`
- Pre-commit runs this package’s Rust lint when `*.rs` / `*.toml` under `src-tauri` are staged

See [Desktop guide](../../docs/en/guide/desktop.md) and [Architecture](../../docs/en/guide/architecture.md).
