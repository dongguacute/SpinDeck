export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.userAgentData?.platform ?? navigator.platform;
  return /Mac/i.test(platform);
}

/** macOS Tauri overlay title bar: native traffic lights + custom drag region */
export function usesTauriOverlayTitleBar(): boolean {
  return isTauri() && isMacOS();
}
