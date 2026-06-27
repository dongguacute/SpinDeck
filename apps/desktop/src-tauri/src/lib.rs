#[cfg(not(dev))]
mod server;

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
      configure_window(app.handle())?;

      #[cfg(not(dev))]
      server::start_and_navigate(app.handle())?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
