/** QQ 音乐 Mac 客户端控制（AppleScript） */

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
