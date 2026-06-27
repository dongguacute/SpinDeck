import { setAccessibilityMissingHandler } from "@spindeck/player";
import { isTauri } from "./is-tauri";

/** 检测当前进程是否拥有 macOS 辅助功能权限（非 Tauri 环境返回 true） */
export async function checkAccessibilityPermission(): Promise<boolean> {
  if (!isTauri()) return true;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("check_accessibility_permission");
  } catch (err) {
    console.warn("[Accessibility] check permission failed:", err);
    return true; // 检测失败不阻塞流程
  }
}

/** 打开「系统设置 > 隐私与安全性 > 辅助功能」面板 */
export async function openAccessibilitySettings(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_accessibility_settings");
  } catch (err) {
    console.warn("[Accessibility] open settings failed:", err);
  }
}

let handlerInstalled = false;

/**
 * 注册辅助功能权限缺失回调。
 *
 * 不在 pauseSong 调用前预检测，避免异步检测延迟导致与 beginShelfSession
 * 的 pause 调用产生竞态条件（被误判为播放行为）。
 *
 * 策略：
 * 1. 启动时主动检测一次，缺失则打开系统设置引导
 * 2. 运行时依赖 server 端 403 响应触发 handler
 */
export async function bootstrapAccessibilityHandler(): Promise<void> {
  if (!isTauri() || handlerInstalled) return;
  handlerInstalled = true;

  // 注入权限缺失回调（打开系统设置面板）
  // 当 server 端 osascript 失败返回 403 时，pauseSong 会触发此回调
  setAccessibilityMissingHandler(async () => {
    await openAccessibilitySettings();
  });

  // 启动时主动检测：权限缺失则立即打开系统设置引导用户授权
  const granted = await checkAccessibilityPermission();
  if (!granted) {
    console.warn("[Accessibility] Permission missing on startup, opening settings");
    await openAccessibilitySettings();
  }
}
