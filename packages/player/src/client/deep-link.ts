import type { PlatformType, SongInfo } from "../types";

/** 浏览器内唤起（备用） */
export function openDeepLink(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "display:none;width:0;height:0;border:0";
  iframe.src = url;
  document.body.appendChild(iframe);
  window.setTimeout(() => iframe.remove(), 1500);
}

function buildWebFallback(platform: PlatformType, song: SongInfo): string {
  const query = encodeURIComponent(`${song.name} ${song.artist}`);
  switch (platform) {
    case "QQMusic":
      if (song.platformSongId) {
        return `https://y.qq.com/n/yqq/song/${song.platformSongId}.html`;
      }
      return `https://y.qq.com/n/yqq/song/search?w=${query}`;
    case "NetEaseMusic":
      if (song.platformSongId) {
        return `https://music.163.com/song?id=${song.platformSongId}`;
      }
      return `https://music.163.com/#/search/m/?s=${query}`;
    case "Spotify":
      if (song.platformSongId) {
        return `https://open.spotify.com/track/${song.platformSongId}`;
      }
      return `https://open.spotify.com/search/${query}`;
    case "AppleMusic":
      return `https://music.apple.com/search?term=${query}`;
    case "KugouMusic":
      return `https://www.kugou.com/yy/html/search.html#searchType=song&searchKeyWord=${query}`;
    case "YTMusic":
      return `https://music.youtube.com/search?q=${query}`;
  }
}

export function clientFallbackPlay(
  platform: PlatformType,
  song: SongInfo,
  urls: string[],
): { ok: boolean; playing: boolean } {
  if (urls.length > 0) {
    openDeepLink(urls[0]);
    return { ok: true, playing: false };
  }
  window.open(buildWebFallback(platform, song), "_blank", "noopener,noreferrer");
  return { ok: true, playing: false };
}
