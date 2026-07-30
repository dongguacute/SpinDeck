//! Embedded local HTTP server: `/api/*` + SPA static files on `127.0.0.1:17345`.

mod port;
mod static_files;

#[cfg(not(dev))]
mod error_page;

use std::sync::Mutex;

use tauri::Manager;
use tokio::sync::oneshot;

pub use port::{prepare_bind, wait_for_server};
pub use static_files::{build_router, resolve_web_dir};

#[cfg(not(dev))]
pub use error_page::show_startup_error;

pub const SERVER_PORT: u16 = 17345;

pub struct ServerState {
  pub shutdown: Mutex<Option<oneshot::Sender<()>>>,
}

async fn run_server(
  web_dir: Option<std::path::PathBuf>,
  shutdown_rx: oneshot::Receiver<()>,
) -> Result<(), String> {
  prepare_bind();

  let app = build_router(web_dir);
  let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{SERVER_PORT}"))
    .await
    .map_err(|e| format!("Failed to bind local server: {e}"))?;

  axum::serve(listener, app)
    .with_graceful_shutdown(async {
      let _ = shutdown_rx.await;
    })
    .await
    .map_err(|e| format!("Local server error: {e}"))
}

/// Start the embedded HTTP server. Always runs (dev + prod) so `/api/*` is available.
pub fn start(app: &tauri::AppHandle) -> Result<(), String> {
  let web_dir = resolve_web_dir(app);
  let (shutdown_tx, shutdown_rx) = oneshot::channel();

  tauri::async_runtime::spawn(async move {
    if let Err(err) = run_server(web_dir, shutdown_rx).await {
      eprintln!("SpinDeck server stopped: {err}");
    }
  });

  wait_for_server(SERVER_PORT)?;
  app.manage(ServerState {
    shutdown: Mutex::new(Some(shutdown_tx)),
  });
  Ok(())
}

/// Production: navigate WebView to the local server (same-origin `/api`).
#[cfg(not(dev))]
pub fn navigate_to_local(app: &tauri::AppHandle) -> Result<(), String> {
  use tauri::Url;

  let url = Url::parse(&format!("http://127.0.0.1:{SERVER_PORT}"))
    .map_err(|error| format!("Invalid local server URL: {error}"))?;
  let Some(window) = app.get_webview_window("main") else {
    return Err("Main window is not available.".to_string());
  };
  window
    .navigate(url)
    .map_err(|error| format!("Failed to open local server in the main window: {error}"))?;
  Ok(())
}

pub fn shutdown(app: &tauri::AppHandle) {
  if let Some(state) = app.try_state::<ServerState>() {
    if let Ok(mut guard) = state.shutdown.lock() {
      if let Some(tx) = guard.take() {
        let _ = tx.send(());
      }
    }
  }
}
