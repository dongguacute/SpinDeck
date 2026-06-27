#[cfg(not(dev))]
mod server;

#[cfg(not(dev))]
use server::ServerProcess;

#[cfg(target_os = "macos")]
mod accessibility;

#[cfg(target_os = "macos")]
use tauri::Manager;

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
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_shell::init());

  #[cfg(target_os = "macos")]
  {
    builder = builder
      .invoke_handler(tauri::generate_handler![
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

      #[cfg(not(dev))]
      if let Err(error) = server::start_and_navigate(app.handle()) {
        server::show_startup_error(app.handle(), &error);
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {
      // Kill the spawned Node.js server when the app exits to prevent orphaned
      // processes that hold the port and cause subsequent launches to fail.
      #[cfg(not(dev))]
      if let tauri::RunEvent::Exit = _event {
        if let Some(state) = _app_handle.try_state::<ServerProcess>() {
          if let Some(mut child) = state.0.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
          }
        }
      }
    });
}
