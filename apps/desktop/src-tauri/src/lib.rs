//! SpinDeck desktop library entry.
//!
//! Module layout:
//! - [`app`] — Tauri shell / window / IPC
//! - [`commands`] — Tauri `invoke` handlers (import + playback)
//! - [`cover`] — custom `cover://` URI scheme for cover-art proxy
//! - [`playlist`] — playlist import providers (QQ / NetEase / Kugou)
//! - [`playback`] — local music-app control (macOS AppleScript)
//! - [`util`] — shared HTTP / HTML helpers
//! - [`types`] — shared request/response DTOs

mod app;
mod commands;
mod cover;
mod playback;
mod playlist;
mod types;
mod util;

pub use app::run;
