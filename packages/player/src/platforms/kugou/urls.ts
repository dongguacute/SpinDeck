import type { DeviceOS, SongInfo } from "../../types";

export function buildKugouPlayUrls(song: SongInfo, os: DeviceOS): string[] {
  const id = song.platformSongId?.trim();
  if (!id) return [];
  
  if (os === "macos") {
    // Mac 版使用 mackugou 协议
    return [`mackugou://start?type=3&cmd=play&content_type=1&content_id=${id}`];
  }
  
  return [`kugoumusic://start?type=3&cmd=play&content_type=1&content_id=${id}`];
}
