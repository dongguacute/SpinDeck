#[cfg(not(dev))]
mod server;

#[cfg(not(dev))]
use server::ServerProcess;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_shell::init())
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
