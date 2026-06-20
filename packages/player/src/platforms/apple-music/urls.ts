import type { DeviceOS, SongInfo } from "../../types";

function buildAppleMusicSearchUrl(song: SongInfo): string {
  const term = encodeURIComponent(`${song.name} ${song.artist}`);
  return `music://itunes.apple.com/search?term=${term}`;
}

export function buildAppleMusicPlayUrls(song: SongInfo, _os: DeviceOS): string[] {
  return [buildAppleMusicSearchUrl(song)];
}
