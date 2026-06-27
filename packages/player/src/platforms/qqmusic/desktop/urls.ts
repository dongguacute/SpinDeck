import type { SongInfo } from "../../../types";
import {
  buildQQMusicMinimalPlayPayload,
  buildQQMusicPlaySonglistPayload,
} from "../mobile/payload";

const QQ_MUSIC_SCHEME = "qqmusic";

function buildPlaySonglistUrl(payload: string): string {
  return `${QQ_MUSIC_SCHEME}://qq.com/media/playSonglist?p=${encodeURIComponent(payload)}`;
}

/** Windows / Linux PC 客户端 cmd 协议（与 Mac 类似，scheme 为 qqmusic） */
function buildDesktopCmdPlayUrl(song: SongInfo): string | null {
  const songid = song.platformNumericId;
  if (songid == null) return null;
  return `${QQ_MUSIC_SCHEME}://QQMusic/?version==73270&&cmd_count==1&&cmd_0==playsong&&id_0==${songid}`;
}

/** Windows / Linux 单曲播放 deep link 列表（按优先级） */
export function buildQQMusicDesktopPlayUrls(song: SongInfo): string[] {
  const songmid = song.platformSongId?.trim();
  if (!songmid && song.platformNumericId == null) return [];

  const urls: string[] = [];

  const cmdUrl = buildDesktopCmdPlayUrl(song);
  if (cmdUrl) urls.push(cmdUrl);

  const fullPayload = buildQQMusicPlaySonglistPayload(song);
  urls.push(buildPlaySonglistUrl(fullPayload));

  const minimalPayload = buildQQMusicMinimalPlayPayload(song);
  if (minimalPayload) {
    urls.push(buildPlaySonglistUrl(minimalPayload));
  }

  return [...new Set(urls)];
}

/** 桌面端继续播放（与移动端协议相同） */
export function buildQQMusicDesktopResumeUrls(): string[] {
  return [
    `${QQ_MUSIC_SCHEME}://qq.com/media/resumeSong`,
    `${QQ_MUSIC_SCHEME}://qq.com/media/resumeSong?p=${encodeURIComponent("{}")}`,
  ];
}
