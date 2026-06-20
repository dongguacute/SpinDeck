import type { DeviceOS, SongInfo } from "../../types";

export function buildKugouPlayUrls(song: SongInfo, _os: DeviceOS): string[] {
  const id = song.platformSongId?.trim();
  return id ? [`kugoumusic://start?type=3&cmd=play&content_type=1&content_id=${id}`] : [];
}
