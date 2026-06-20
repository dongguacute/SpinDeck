import type { DeviceOS, PlatformType, SongInfo } from "./types";
import { buildAppleMusicPlayUrls } from "./platforms/apple-music/urls";
import { buildKugouPlayUrls } from "./platforms/kugou/urls";
import { buildNetEasePlayUrls } from "./platforms/netease/urls";
import { buildQQMusicPlayUrls } from "./platforms/qqmusic/urls";
import { buildSpotifyPlayUrls } from "./platforms/spotify/urls";

/** 构建单曲 deep link 列表（纯函数，可在服务端使用） */
export function buildSongPlayUrls(
  platform: PlatformType,
  song: SongInfo,
  os: DeviceOS = "linux",
): string[] {
  switch (platform) {
    case "QQMusic":
      return buildQQMusicPlayUrls(song, os);
    case "NetEaseMusic":
      return buildNetEasePlayUrls(song, os);
    case "Spotify":
      return buildSpotifyPlayUrls(song, os);
    case "AppleMusic":
      return buildAppleMusicPlayUrls(song, os);
    case "KugouMusic":
      return buildKugouPlayUrls(song, os);
    default:
      return [];
  }
}

export { buildQQMusicPlayUrls } from "./platforms/qqmusic/urls";
