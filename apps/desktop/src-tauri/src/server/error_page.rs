//! Startup failure page shown in the WebView when the local server cannot start.

use tauri::Manager;
use tauri::Url;

use std::{
  fs::{self, OpenOptions},
  io::Write,
};

fn append_startup_log(app: &tauri::AppHandle, message: &str) {
  eprintln!("SpinDeck startup: {message}");
  let Ok(log_dir) = app.path().app_log_dir() else {
    return;
  };
  if fs::create_dir_all(&log_dir).is_err() {
    return;
  }
  let log_path = log_dir.join("startup.log");
  if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
    let _ = writeln!(file, "{message}");
  }
}

fn html_escape(text: &str) -> String {
  text
    .replace('&', "&amp;")
    .replace('<', "&lt;")
    .replace('>', "&gt;")
    .replace('"', "&quot;")
}

fn percent_encode_data_url(input: &str) -> String {
  input
    .bytes()
    .map(|byte| match byte {
      b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
        (byte as char).to_string()
      }
      _ => format!("%{byte:02X}"),
    })
    .collect()
}

fn error_page_url(message: &str) -> Result<Url, String> {
  let html = format!(
    r#"<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpinDeck</title><style>body{{font-family:system-ui,-apple-system,sans-serif;background:#fdfaf2;color:#5c4d41;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}}main{{max-width:560px}}h1{{font-size:22px;margin:0 0 12px}}p{{line-height:1.6;margin:0;white-space:pre-wrap}}</style></head><body><main><h1>SpinDeck failed to start</h1><p>{}</p></main></body></html>"#,
    html_escape(message)
  );
  Url::parse(&format!(
    "data:text/html;charset=utf-8,{}",
    percent_encode_data_url(&html)
  ))
  .map_err(|error| format!("Failed to build startup error page: {error}"))
}

pub fn show_startup_error(app: &tauri::AppHandle, message: &str) {
  append_startup_log(app, message);
  let Some(window) = app.get_webview_window("main") else {
    return;
  };
  let Ok(url) = error_page_url(message) else {
    return;
  };
  if let Err(error) = window.navigate(url) {
    append_startup_log(app, &format!("Failed to show startup error page: {error}"));
  }
}
