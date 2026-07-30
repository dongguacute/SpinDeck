//! Port binding helpers for the embedded local server.

use std::{
  net::TcpStream,
  process::Command,
  thread,
  time::{Duration, Instant},
};

use super::SERVER_PORT;

const SERVER_START_TIMEOUT: Duration = Duration::from_secs(30);
const SERVER_POLL_INTERVAL: Duration = Duration::from_millis(200);

pub fn kill_process_on_port(port: u16) {
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

fn is_server_ready(port: u16) -> bool {
  TcpStream::connect(format!("127.0.0.1:{port}")).is_ok()
}

pub fn wait_for_server(port: u16) -> Result<(), String> {
  let deadline = Instant::now() + SERVER_START_TIMEOUT;
  while Instant::now() < deadline {
    if is_server_ready(port) {
      return Ok(());
    }
    thread::sleep(SERVER_POLL_INTERVAL);
  }
  Err(format!(
    "Timed out waiting for the local server on port {port}."
  ))
}

pub fn prepare_bind() {
  kill_process_on_port(SERVER_PORT);
  thread::sleep(Duration::from_millis(200));
}
