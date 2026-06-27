const QQ_MUSIC_SCHEME = "qqmusic";
const QQ_MUSIC_PACKAGE = "com.tencent.qqmusic";

/** Android Intent：定向 QQ 音乐包内的媒体控制路由 */
function buildAndroidMediaIntent(mediaPath: string): string {
  return `intent://${mediaPath}#Intent;scheme=${QQ_MUSIC_SCHEME};package=${QQ_MUSIC_PACKAGE};end`;
}

/**
 * Android 暂停 URL（仅明确 pause，不含 togglePlay）。
 * togglePlay 在 pauseSong 成功后会把播放切回去，是「有时能停有时不能」的主因。
 */
export function buildQQMusicAndroidPauseUrls(): string[] {
  const emptyPayload = encodeURIComponent("{}");
  const pausePayload = encodeURIComponent(JSON.stringify({ action: "pause" }));

  return [
    buildAndroidMediaIntent("qq.com/media/pauseSong"),
    `${QQ_MUSIC_SCHEME}://qq.com/media/pauseSong`,
    buildAndroidMediaIntent(`qq.com/media/pauseSong?p=${emptyPayload}`),
    `${QQ_MUSIC_SCHEME}://qq.com/media/pauseSong?p=${emptyPayload}`,
    buildAndroidMediaIntent(`qq.com/media/playSonglist?p=${pausePayload}`),
    `${QQ_MUSIC_SCHEME}://qq.com/media/playSonglist?p=${pausePayload}`,
    `${QQ_MUSIC_SCHEME}://QQMusic/?version==73270&&cmd_count==1&&cmd_0==pause`,
  ];
}

/** 继续播放：同样走 QQ 音乐注册的 media 路由 */
export function buildQQMusicAndroidResumeUrls(): string[] {
  const emptyPayload = encodeURIComponent("{}");
  return [
    buildAndroidMediaIntent("qq.com/media/resumeSong"),
    `${QQ_MUSIC_SCHEME}://qq.com/media/resumeSong`,
    buildAndroidMediaIntent(`qq.com/media/resumeSong?p=${emptyPayload}`),
    `${QQ_MUSIC_SCHEME}://qq.com/media/resumeSong?p=${emptyPayload}`,
  ];
}
