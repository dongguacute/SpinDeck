//! Tauri application shell: window chrome, IPC commands, lifecycle wiring.

#[cfg(target_os = "macos")]
mod accessibility;

use tauri::Manager;

use crate::server;

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

fn start_local_backend(app: &tauri::AppHandle) {
  if let Err(error) = server::start(app) {
    eprintln!("Failed to start local API server: {error}");
    #[cfg(not(dev))]
    server::show_startup_error(app, &error);
  } else {
    #[cfg(not(dev))]
    if let Err(error) = server::navigate_to_local(app) {
      server::show_startup_error(app, &error);
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_shell::init());

  #[cfg(target_os = "macos")]
  {
    builder = builder.invoke_handler(tauri::generate_handler![
      check_accessibility_permission,
      open_accessibility_settings,
    ]);
  }

  builder
    .setup(|app| {
      #[cfg(target_os = "macos")]
      if let Err(error) = configure_window(app.handle()) {
        eprintln!("Window configuration failed: {error}");
      }

      // Always start Rust HTTP API (dev uses Vite proxy → :17345).
      start_local_backend(app.handle());

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if let tauri::RunEvent::Exit = event {
        server::shutdown(app_handle);
      }
    });
}
