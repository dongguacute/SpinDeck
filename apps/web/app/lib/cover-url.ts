import { isTauri } from "./is-tauri";

/**
 * Build a WebView-loadable URL for remote cover art.
 * In Tauri this goes through the native `cover` URI scheme (Referer + size limits).
 * In the browser, the original URL is returned (CORS may block some CDNs).
 */
export function proxiedCoverUrl(coverUrl: string): string {
  if (!coverUrl) return coverUrl;
  if (!isTauri()) return coverUrl;

  const encoded = encodeURIComponent(coverUrl);
  // Windows/Android use http://<scheme>.localhost; other platforms use <scheme>://localhost
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const useHttpLocalhost = /Windows|Android/i.test(ua);
  return useHttpLocalhost
    ? `http://cover.localhost/?url=${encoded}`
    : `cover://localhost/?url=${encoded}`;
}
