const QQ_MUSIC_SCHEME = "qqmusic";

/** 非 Mac 客户端暂停：togglePlay 在社区中比 pauseSong 更常见 */
export function buildQQMusicClientPauseUrls(): string[] {
  const emptyPayload = encodeURIComponent("{}");
  return [
    `${QQ_MUSIC_SCHEME}://qq.com/media/togglePlay`,
    `${QQ_MUSIC_SCHEME}://qq.com/media/pauseSong`,
    `${QQ_MUSIC_SCHEME}://qq.com/media/pauseSong?p=${emptyPayload}`,
    `${QQ_MUSIC_SCHEME}://qq.com/media/playSonglist?p=${encodeURIComponent(JSON.stringify({ action: "pause" }))}`,
    `${QQ_MUSIC_SCHEME}://QQMusic/?version==73270&&cmd_count==1&&cmd_0==pause`,
  ];
}

/** 移动端暂停优先 toggle（播放/暂停切换） */
export function pickQQMusicMobilePauseUrl(): string {
  return buildQQMusicClientPauseUrls()[0];
}
