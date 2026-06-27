import type { DeviceOS, SongInfo } from "../../../types";
import {
  buildQQMusicMinimalPlayPayload,
  buildQQMusicPlaySonglistPayload,
} from "./payload";

const QQ_MUSIC_SCHEME = "qqmusic";

function buildPlaySonglistUrl(payload: string): string {
  return `${QQ_MUSIC_SCHEME}://qq.com/media/playSonglist?p=${encodeURIComponent(payload)}`;
}

/** Android 备用 intent 格式，提升 Chrome 唤起成功率 */
function buildAndroidIntentUrl(payload: string): string {
  const fallback = encodeURIComponent("https://y.qq.com");
  return `intent://qq.com/media/playSonglist?p=${encodeURIComponent(payload)}#Intent;scheme=${QQ_MUSIC_SCHEME};package=com.tencent.qqmusic;S.browser_fallback_url=${fallback};end`;
}

/** iOS / iPadOS / Android 单曲播放 deep link 列表（按优先级） */
export function buildQQMusicMobilePlayUrls(song: SongInfo, os: DeviceOS): string[] {
  const songmid = song.platformSongId?.trim();
  if (!songmid && song.platformNumericId == null) return [];

  const urls: string[] = [];
  const fullPayload = buildQQMusicPlaySonglistPayload(song);
  urls.push(buildPlaySonglistUrl(fullPayload));

  const minimalPayload = buildQQMusicMinimalPlayPayload(song);
  if (minimalPayload) {
    urls.push(buildPlaySonglistUrl(minimalPayload));
  }

  if (os === "android") {
    urls.push(buildAndroidIntentUrl(fullPayload));
  }

  return [...new Set(urls)];
}

/** 移动端继续播放 */
export function buildQQMusicMobileResumeUrls(): string[] {
  return [
    `${QQ_MUSIC_SCHEME}://qq.com/media/resumeSong`,
    `${QQ_MUSIC_SCHEME}://qq.com/media/resumeSong?p=${encodeURIComponent("{}")}`,
  ];
}
