import type { DeviceOS, SongInfo } from "../../types";

function buildNetEasePlayUrl(songId: string): string {
  return `orpheus://song/${songId}`;
}

export function buildNetEasePlayUrls(song: SongInfo, _os: DeviceOS): string[] {
  const id = song.platformSongId?.trim();
  return id ? [buildNetEasePlayUrl(id)] : [];
}
