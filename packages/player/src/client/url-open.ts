export type UrlOpener = (url: string) => void | Promise<void>;

let appUrlOpener: UrlOpener | null = null;
let externalUrlOpener: UrlOpener | null = null;

/** 注入自定义 scheme 唤起（桌面端 Tauri shell.open） */
export function setAppUrlOpener(opener: UrlOpener | null): void {
  appUrlOpener = opener;
}

/** 注入 https 等外链打开方式 */
export function setExternalUrlOpener(opener: UrlOpener | null): void {
  externalUrlOpener = opener;
}

export async function dispatchAppUrl(url: string): Promise<boolean> {
  if (!appUrlOpener) return false;
  try {
    await appUrlOpener(url);
    return true;
  } catch (err) {
    console.warn("[AppUrl] open failed:", url, err);
    return false;
  }
}

export async function dispatchExternalUrl(url: string): Promise<boolean> {
  if (!externalUrlOpener) return false;
  try {
    await externalUrlOpener(url);
    return true;
  } catch (err) {
    console.warn("[ExternalUrl] open failed:", url, err);
    return false;
  }
}

/** 等待桌面端注入 shell.open（root 异步 bootstrap 完成前） */
export async function waitForAppUrlOpener(timeoutMs = 3000): Promise<boolean> {
  if (appUrlOpener) return true;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (appUrlOpener) return true;
  }
  return false;
}
