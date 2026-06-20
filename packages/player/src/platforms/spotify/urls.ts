import type { DeviceOS, SongInfo } from "../../types";

function buildSpotifyPlayUrl(trackId: string): string {
  return `spotify:track:${trackId}`;
}

export function buildSpotifyPlayUrls(song: SongInfo, _os: DeviceOS): string[] {
  const id = song.platformSongId?.trim();
  return id ? [buildSpotifyPlayUrl(id)] : [];
}
