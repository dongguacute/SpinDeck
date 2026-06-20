/** 服务端控制 QQ 音乐 Mac 客户端（AppleScript） */

export const QQ_MUSIC_PAUSE_SCRIPT = `
tell application "System Events"
  if exists process "QQMusic" then
    tell process "QQMusic"
      if (name of menu item 1 of menu "播放控制" of menu bar item "播放控制" of menu bar 1) is "暂停" then
        click menu item "暂停" of menu "播放控制" of menu bar item "播放控制" of menu bar 1
        return "paused"
      end if
    end tell
  end if
end tell
return "idle"
`.trim();

export const QQ_MUSIC_RESUME_SCRIPT = `
tell application "System Events"
  if exists process "QQMusic" then
    tell process "QQMusic"
      if (name of menu item 1 of menu "播放控制" of menu bar item "播放控制" of menu bar 1) is "播放" then
        click menu item "播放" of menu "播放控制" of menu bar item "播放控制" of menu bar 1
        return "resumed"
      end if
    end tell
  end if
end tell
return "idle"
`.trim();

export const QQ_MUSIC_IS_PLAYING_SCRIPT = `
tell application "System Events"
  if exists process "QQMusic" then
    tell process "QQMusic"
      if (name of menu item 1 of menu "播放控制" of menu bar item "播放控制" of menu bar 1) is "暂停" then
        return "true"
      end if
    end tell
  end if
end tell
return "false"
`.trim();

export const PLAY_DETECT_TIMEOUT_MS = 5000;
export const PLAY_DETECT_INTERVAL_MS = 300;

export type ExecFileAsync = (
  file: string,
  args: string[],
) => Promise<{ stdout: string | Buffer }>;

export async function isQQMusicPlaying(execFileAsync: ExecFileAsync): Promise<boolean> {
  const { stdout } = await execFileAsync("osascript", ["-e", QQ_MUSIC_IS_PLAYING_SCRIPT]);
  return String(stdout).trim() === "true";
}

export async function waitForQQMusicPlaying(execFileAsync: ExecFileAsync): Promise<boolean> {
  if (await isQQMusicPlaying(execFileAsync)) return true;
  const polls = Math.ceil(PLAY_DETECT_TIMEOUT_MS / PLAY_DETECT_INTERVAL_MS);
  for (let i = 0; i < polls; i++) {
    await new Promise((r) => setTimeout(r, PLAY_DETECT_INTERVAL_MS));
    if (await isQQMusicPlaying(execFileAsync)) return true;
  }
  return false;
}
