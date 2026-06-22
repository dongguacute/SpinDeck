import type { DeviceOS, SongInfo } from "../../types";
import { buildQQMusicMacPlayUrls } from "./macos/urls";

function qqMusicScheme(os: DeviceOS): string {
  if (os === "macos") return "qqmusicmac";
  return "qqmusic";
}

function buildQQMusicPlaySonglistPayload(song: SongInfo): string {
  const entry: Record<string, string | number> = {
    type: "0",
    songmid: song.platformSongId?.trim() ?? "",
    songtype: song.platformSongType ?? 0,
  };
  if (song.platformNumericId != null) {
    entry.songid = song.platformNumericId;
  }
  return JSON.stringify({ song: [entry], action: "play", index: 0 });
}

function buildQQMusicMobileOrDesktopUrls(song: SongInfo, os: DeviceOS): string[] {
  const songmid = song.platformSongId?.trim();
  if (!songmid && song.platformNumericId == null) return [];
  const scheme = qqMusicScheme(os);
  const encoded = encodeURIComponent(buildQQMusicPlaySonglistPayload(song));
  return [`${scheme}://qq.com/media/playSonglist?p=${encoded}`];
}

/** 按系统构建 QQ 音乐单曲 deep link */
export function buildQQMusicPlayUrls(song: SongInfo, os: DeviceOS): string[] {
  switch (os) {
    case "macos":
      return buildQQMusicMacPlayUrls(song);
    case "windows":
    case "linux":
    case "android":
    case "ios":
      return buildQQMusicMobileOrDesktopUrls(song, os);
  }
}

export { buildQQMusicMacPlayUrls } from "./macos/urls";
