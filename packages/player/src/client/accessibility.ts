/**
 * 辅助功能权限缺失处理。
 *
 * 桌面端打包后，Node.js 子进程通过 osascript 控制 QQ 音乐/网易云菜单需要
 * macOS「辅助功能」权限。当权限缺失时，server 端 osascript 失败返回 403，
 * 客户端通过此回调通知应用层（Tauri）打开系统设置引导用户授权。
 *
 * 不在 pauseSong 调用前预检测，避免异步检测带来延迟导致与 beginShelfSession
 * 的 pause 调用产生竞态条件（被误判为播放行为）。
 */

export type AccessibilityMissingHandler = () => void | Promise<void>;

let handler: AccessibilityMissingHandler | null = null;

/** 注入权限缺失回调（打开系统设置面板） */
export function setAccessibilityMissingHandler(
  next: AccessibilityMissingHandler | null,
): void {
  handler = next;
}

export async function dispatchAccessibilityMissing(): Promise<void> {
  if (!handler) return;
  try {
    await handler();
  } catch (err) {
    console.warn("[Accessibility] handler failed:", err);
  }
}
