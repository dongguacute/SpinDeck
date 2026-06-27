use std::{
  path::PathBuf,
  process::{Command, Stdio},
  thread,
  time::Duration,
};

use tauri::{Manager, Url};

const SERVER_PORT: u16 = 17345;

fn resolve_serve_script(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
  Ok(app
    .path()
    .resource_dir()?
    .join("scripts/serve.mjs"))
}

fn resolve_runtime_root(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
  Ok(app.path().resource_dir()?.join("web-runtime"))
}

fn start_local_server(app: &tauri::AppHandle) -> Result<u16, Box<dyn std::error::Error>> {
  let serve_script = resolve_serve_script(app)?;
  let runtime_root = resolve_runtime_root(app)?;
  let web_root = runtime_root.join("build");

  if !serve_script.exists() {
    return Err(format!("Missing serve script: {}", serve_script.display()).into());
  }

  if !web_root.join("server/index.js").exists() {
    return Err(format!("Missing server build: {}", web_root.display()).into());
  }

  Command::new("node")
    .arg(&serve_script)
    .env("PORT", SERVER_PORT.to_string())
    .env("SPINDECK_RUNTIME_ROOT", &runtime_root)
    .env("SPINDECK_WEB_ROOT", &web_root)
    .env("NODE_ENV", "production")
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .spawn()?;

  thread::sleep(Duration::from_millis(1500));
  Ok(SERVER_PORT)
}

pub fn start_and_navigate(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  let port = start_local_server(app)?;
  let url = Url::parse(&format!("http://127.0.0.1:{port}"))?;

  if let Some(window) = app.get_webview_window("main") {
    window.navigate(url)?;
  }

  Ok(())
}
