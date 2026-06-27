//! macOS 辅助功能权限检测。
//!
//! 从 `.app` 启动的 Node.js 子进程通过 `osascript` 调用 System Events 控制
//! 第三方应用 UI（菜单点击、键盘事件）需要「辅助功能」权限。
//! 开发模式下终端已授权所以工作正常；打包后 SpinDeck.app 需要单独授权。

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
  fn AXIsProcessTrusted() -> bool;
}

/// 检测当前进程是否拥有辅助功能权限。
#[cfg(target_os = "macos")]
pub fn check_accessibility() -> bool {
  // SAFETY: AXIsProcessTrusted 是无副作用、线程安全的 C API。
  unsafe { AXIsProcessTrusted() }
}

#[cfg(not(target_os = "macos"))]
pub fn check_accessibility() -> bool {
  true
}

/// 打开「系统设置 > 隐私与安全性 > 辅助功能」面板。
#[cfg(target_os = "macos")]
pub fn open_accessibility_settings() -> Result<(), String> {
  std::process::Command::new("open")
    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
    .spawn()
    .map_err(|error| format!("Failed to open Accessibility settings: {error}"))?;
  Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn open_accessibility_settings() -> Result<(), String> {
  Err("Accessibility settings are only available on macOS".to_string())
}
