//! SpinDeck desktop library entry.
//!
//! Module layout:
//! - [`app`] — Tauri shell / window / IPC
//! - [`server`] — embedded HTTP lifecycle + static SPA
//! - [`api`] — `/api/*` route handlers
//! - [`playlist`] — playlist import providers (QQ / NetEase / Kugou)
//! - [`playback`] — local music-app control (macOS AppleScript)
//! - [`util`] — shared HTTP / HTML helpers
//! - [`types`] — shared request/response DTOs

mod api;
mod app;
mod playback;
mod playlist;
mod server;
mod types;
mod util;

pub use app::run;
