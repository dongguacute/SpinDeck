import type { PlaylistResult } from '../components/getQQMusicList';

interface CacheEntry {
  expires: number;
  result: PlaylistResult;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function getCachedPlaylist(key: string): PlaylistResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCachedPlaylist(
  key: string,
  result: PlaylistResult,
  ttlMs = DEFAULT_TTL_MS,
): void {
  cache.set(key, { expires: Date.now() + ttlMs, result });
}

export function invalidateCachedPlaylist(platform: string, url: string): void {
  cache.delete(playlistCacheKey(platform, url));
}

export function playlistCacheKey(platform: string, url: string): string {
  return `${platform}:${url.trim()}`;
}
