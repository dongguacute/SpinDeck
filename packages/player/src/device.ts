import type { DeviceOS } from "./types";

let nativeOsOverride: DeviceOS | null = null;

/** 由应用层注入真实 OS（如 Tauri 桌面端），避免 WebView UA 误判 */
export function setNativeDeviceOS(os: DeviceOS | null): void {
  nativeOsOverride = os;
}

export function getDeviceOS(): DeviceOS {
  if (nativeOsOverride) return nativeOsOverride;

  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macos";
  return "linux";
}
