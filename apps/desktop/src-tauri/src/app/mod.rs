//! Tauri application shell: window chrome, IPC commands, lifecycle wiring.

#[cfg(target_os = "macos")]
mod accessibility;

use tauri::Manager;

use crate::commands;
use crate::cover;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_shell::init());

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
      #[cfg(target_os = "macos")]
      if let Err(error) = configure_window(app.handle()) {
        eprintln!("Window configuration failed: {error}");
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
