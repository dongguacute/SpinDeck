use std::{
  fs::{self, OpenOptions},
  io::Write,
  net::TcpStream,
  path::PathBuf,
  process::{Child, Command, Stdio},
  sync::Mutex,
  thread,
  time::{Duration, Instant},
};

use tauri::{Manager, Url};

const SERVER_PORT: u16 = 17345;
const SERVER_START_TIMEOUT: Duration = Duration::from_secs(30);
const SERVER_POLL_INTERVAL: Duration = Duration::from_millis(200);

/// Holds the spawned Node.js server process so it can be killed when the app exits.
pub struct ServerProcess(pub Mutex<Option<Child>>);

/// Kills any process listening on the given port.
///
/// On subsequent app launches, a previous Node.js server may still be holding the
/// port (orphaned child process). This clears it so the new server can bind.
fn kill_process_on_port(port: u16) {
  #[cfg(unix)]
  {
    if let Ok(output) = Command::new("lsof")
      .args(["-ti", &format!(":{port}"), "-sTCP:LISTEN"])
      .output()
    {
      let stdout = String::from_utf8_lossy(&output.stdout);
      for pid_str in stdout.lines() {
        if let Ok(pid) = pid_str.parse::<i32>() {
          let _ = Command::new("kill").args(["-9", &pid.to_string()]).output();
        }
      }
    }
  }

  #[cfg(windows)]
  {
    if let Ok(output) = Command::new("cmd")
      .args(["/C", &format!("netstat -ano | findstr :{port}")])
      .output()
    {
      let stdout = String::from_utf8_lossy(&output.stdout);
      for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 && parts.last() != Some(&"0") {
          let _ = Command::new("taskkill")
            .args(["/PID", parts[4], "/F"])
            .output();
        }
      }
    }
  }
}

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

fn push_unique_candidate(candidates: &mut Vec<PathBuf>, path: PathBuf) {
  if !candidates.contains(&path) {
    candidates.push(path);
  }
}

fn resolve_node_executable() -> Result<PathBuf, String> {
  let mut candidates = Vec::new();

  if let Ok(node) = std::env::var("SPINDECK_NODE") {
    push_unique_candidate(&mut candidates, PathBuf::from(node));
  }

  if let Ok(path) = std::env::var("PATH") {
    for dir in path.split(':').filter(|dir| !dir.is_empty()) {
      push_unique_candidate(&mut candidates, PathBuf::from(dir).join("node"));
    }
  }

  for path in [
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/node",
  ] {
    push_unique_candidate(&mut candidates, PathBuf::from(path));
  }

  if let Ok(home) = std::env::var("HOME") {
    let home = PathBuf::from(home);
    push_unique_candidate(&mut candidates, home.join(".fnm/current/bin/node"));
    push_unique_candidate(&mut candidates, home.join(".volta/bin/node"));
    push_unique_candidate(&mut candidates, home.join(".asdf/shims/node"));

    if let Ok(version) = fs::read_to_string(home.join(".nvm/alias/default")) {
      let version = version.trim().trim_start_matches('v');
      push_unique_candidate(
        &mut candidates,
        home.join(".nvm/versions/node")
          .join(format!("v{version}"))
          .join("bin/node"),
      );
    }
  }

  #[cfg(windows)]
  {
    for path in [
      r"C:\Program Files\nodejs\node.exe",
      r"C:\Program Files (x86)\nodejs\node.exe",
    ] {
      push_unique_candidate(&mut candidates, PathBuf::from(path));
    }

    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
      push_unique_candidate(
        &mut candidates,
        PathBuf::from(local_app_data)
          .join("fnm")
          .join("current")
          .join("node.exe"),
      );
    }
  }

  for candidate in candidates {
    if candidate.is_file() {
      return Ok(candidate);
    }
  }

  Err(
    "Node.js was not found. Install Node.js from https://nodejs.org/ and open SpinDeck again."
      .to_string(),
  )
}

fn resolve_serve_script(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let resource_dir = app
    .path()
    .resource_dir()
    .map_err(|error| format!("Failed to resolve resource directory: {error}"))?;

  Ok(resource_dir.join("scripts/serve.mjs"))
}

fn resolve_runtime_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let resource_dir = app
    .path()
    .resource_dir()
    .map_err(|error| format!("Failed to resolve resource directory: {error}"))?;

  Ok(resource_dir.join("web-runtime"))
}

fn is_server_ready(port: u16) -> bool {
  TcpStream::connect(format!("127.0.0.1:{port}")).is_ok()
}

fn wait_for_server(port: u16) -> Result<(), String> {
  let deadline = Instant::now() + SERVER_START_TIMEOUT;

  while Instant::now() < deadline {
    if is_server_ready(port) {
      return Ok(());
    }
    thread::sleep(SERVER_POLL_INTERVAL);
  }

  Err(format!(
    "Timed out waiting for the local server on port {port}. Check ~/Library/Logs/com.spindeck.app/server.stderr.log for details."
  ))
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

fn start_local_server(app: &tauri::AppHandle) -> Result<(u16, Child), String> {
  let node = resolve_node_executable()?;
  let serve_script = resolve_serve_script(app)?;
  let runtime_root = resolve_runtime_root(app)?;
  let web_root = runtime_root.join("build");
  let runtime_node_modules = runtime_root.join("node_modules");

  if !serve_script.exists() {
    return Err(format!("Missing serve script: {}", serve_script.display()));
  }

  if !web_root.join("server/index.js").exists() {
    return Err(format!("Missing server build: {}", web_root.display()));
  }

  let log_dir = app
    .path()
    .app_log_dir()
    .map_err(|error| format!("Failed to resolve log directory: {error}"))?;
  fs::create_dir_all(&log_dir)
    .map_err(|error| format!("Failed to create log directory: {error}"))?;

  let stderr_log = OpenOptions::new()
    .create(true)
    .write(true)
    .truncate(true)
    .open(log_dir.join("server.stderr.log"))
    .map_err(|error| format!("Failed to open server log file: {error}"))?;

  // Kill any orphaned server from a previous app launch that may still hold the port.
  // Without this, the new server fails with EADDRINUSE and the app would connect to a
  // stale server serving outdated code.
  kill_process_on_port(SERVER_PORT);
  thread::sleep(Duration::from_millis(200));

  let child = Command::new(&node)
    .arg(&serve_script)
    .env("PORT", SERVER_PORT.to_string())
    .env("SPINDECK_RUNTIME_ROOT", &runtime_root)
    .env("SPINDECK_WEB_ROOT", &web_root)
    .env("NODE_ENV", "production")
    .env("NODE_PATH", &runtime_node_modules)
    .stdout(Stdio::null())
    .stderr(Stdio::from(stderr_log))
    .spawn()
    .map_err(|error| {
      format!(
        "Failed to launch Node.js at {}: {error}",
        node.display()
      )
    })?;

  wait_for_server(SERVER_PORT)?;
  Ok((SERVER_PORT, child))
}

pub fn start_and_navigate(app: &tauri::AppHandle) -> Result<(), String> {
  let (port, child) = start_local_server(app)?;

  // Track the child process so it can be killed when the app exits.
  app.manage(ServerProcess(Mutex::new(Some(child))));

  let url = Url::parse(&format!("http://127.0.0.1:{port}"))
    .map_err(|error| format!("Invalid local server URL: {error}"))?;

  let Some(window) = app.get_webview_window("main") else {
    return Err("Main window is not available.".to_string());
  };

  window
    .navigate(url)
    .map_err(|error| format!("Failed to open local server in the main window: {error}"))?;

  Ok(())
}
