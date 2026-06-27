import type { DeviceOS } from "./types";

let nativeOsOverride: DeviceOS | null = null;

/** 由应用层注入真实 OS（如 Tauri 桌面端），避免 WebView UA 误判 */
export function setNativeDeviceOS(os: DeviceOS | null): void {
  nativeOsOverride = os;
}

function detectMacOSFromNavigator(): boolean {
  if (typeof navigator === "undefined") return false;

  if (/Mac/i.test(navigator.platform)) return true;

  return /Mac OS X|Macintosh/i.test(navigator.userAgent);
}

export function getDeviceOS(): DeviceOS {
  if (nativeOsOverride) return nativeOsOverride;

  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Windows/i.test(ua)) return "windows";
  if (detectMacOSFromNavigator()) return "macos";
  return "linux";
}
