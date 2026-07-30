use tokio::process::Command;

pub async fn run_osascript(script: &str) -> Result<String, String> {
  let output = Command::new("osascript")
    .arg("-e")
    .arg(script)
    .output()
    .await
    .map_err(|e| e.to_string())?;
  let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
  if !output.status.success() && stdout.is_empty() {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    return Err(if stderr.is_empty() {
      "osascript failed".into()
    } else {
      stderr
    });
  }
  Ok(stdout)
}

pub async fn open_url(args: &[&str]) -> Result<(), String> {
  let status = Command::new("open")
    .args(args)
    .status()
    .await
    .map_err(|e| e.to_string())?;
  if status.success() {
    Ok(())
  } else {
    Err("open failed".into())
  }
}

pub fn needs_accessibility_output(output: &str) -> bool {
  let lower = output.to_lowercase();
  output.starts_with("error:") || lower.contains("assistive") || lower.contains("not allowed")
}
