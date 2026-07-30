//! Tauri application shell: window chrome, IPC commands, lifecycle wiring.

#[cfg(target_os = "macos")]
mod accessibility;

use std::fs;
use std::path::{Path, PathBuf};

use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};
use time::macros::format_description;
use time::OffsetDateTime;

use crate::commands;
use crate::cover;

/// How many per-session log files to retain (newest first).
const MAX_SESSION_LOG_FILES: usize = 50;

#[cfg(target_os = "macos")]
fn configure_window(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  let Some(window) = app.get_webview_window("main") else {
    return Ok(());
  };

  use tauri::TitleBarStyle;
  window.set_title("SpinDeck")?;
  window.set_title_bar_style(TitleBarStyle::Overlay)?;

  Ok(())
}

/// 检测当前进程是否拥有 macOS 辅助功能权限。
#[cfg(target_os = "macos")]
#[tauri::command]
fn check_accessibility_permission() -> bool {
  accessibility::check_accessibility()
}

/// 打开「系统设置 > 隐私与安全性 > 辅助功能」面板。
#[cfg(target_os = "macos")]
#[tauri::command]
fn open_accessibility_settings() -> Result<(), String> {
  accessibility::open_accessibility_settings()
}

fn install_panic_hook() {
  let default_hook = std::panic::take_hook();
  std::panic::set_hook(Box::new(move |info| {
    let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
      (*s).to_string()
    } else if let Some(s) = info.payload().downcast_ref::<String>() {
      s.clone()
    } else {
      "unknown panic payload".to_string()
    };
    let location = info
      .location()
      .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
      .unwrap_or_else(|| "unknown location".to_string());
    log::error!("panic: {payload} at {location}");
    default_hook(info);
  }));
}

/// Per-launch log stem: `spindeck-2026-07-31_01-50-45` (local time, sortable).
fn session_log_stem() -> String {
  let format = format_description!("[year]-[month]-[day]_[hour]-[minute]-[second]");
  let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
  match now.format(&format) {
    Ok(stamp) => format!("spindeck-{stamp}"),
    Err(_) => format!("spindeck-{}", OffsetDateTime::now_utc().unix_timestamp()),
  }
}

/// Drop oldest session logs so the directory stays bounded while history remains.
fn prune_old_session_logs(log_dir: &Path, keep: usize) {
  let Ok(entries) = fs::read_dir(log_dir) else {
    return;
  };

  let mut files: Vec<PathBuf> = entries
    .filter_map(|entry| entry.ok().map(|e| e.path()))
    .filter(|path| {
      path
        .file_name()
        .and_then(|n| n.to_str())
        .is_some_and(|name| name.starts_with("spindeck-") && name.ends_with(".log"))
    })
    .collect();

  // Timestamped names sort lexicographically newest-last; reverse for newest-first.
  files.sort();
  files.reverse();

  for path in files.into_iter().skip(keep) {
    let _ = fs::remove_file(path);
  }
}

fn log_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
  let level = if cfg!(debug_assertions) {
    log::LevelFilter::Debug
  } else {
    log::LevelFilter::Info
  };

  let session_file = session_log_stem();

  tauri_plugin_log::Builder::new()
    .level(level)
    .max_file_size(5_000_000)
    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
    .targets([
      Target::new(TargetKind::Stdout),
      Target::new(TargetKind::LogDir {
        file_name: Some(session_file),
      }),
    ])
    .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(log_plugin());

  let builder = cover::register_protocol(builder);

  #[cfg(target_os = "macos")]
  let builder = builder.invoke_handler(tauri::generate_handler![
    check_accessibility_permission,
    open_accessibility_settings,
    commands::import::import_playlist,
    commands::playback::play_song,
    commands::playback::pause_song,
    commands::playback::resume_song,
    commands::playback::playback_status,
    commands::playback::set_play_mode,
  ]);

  #[cfg(not(target_os = "macos"))]
  let builder = builder.invoke_handler(tauri::generate_handler![
    commands::import::import_playlist,
    commands::playback::play_song,
    commands::playback::pause_song,
    commands::playback::resume_song,
    commands::playback::playback_status,
    commands::playback::set_play_mode,
  ]);

  builder
    .setup(|app| {
      install_panic_hook();
      if let Ok(log_dir) = app.path().app_log_dir() {
        prune_old_session_logs(&log_dir, MAX_SESSION_LOG_FILES);
        log::info!("session log dir={}", log_dir.display());
      }
      log::info!(
        "SpinDeck desktop starting version={} os={} arch={}",
        env!("CARGO_PKG_VERSION"),
        std::env::consts::OS,
        std::env::consts::ARCH
      );
      #[cfg(target_os = "macos")]
      if let Err(error) = configure_window(app.handle()) {
        log::error!("Window configuration failed: {error}");
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
