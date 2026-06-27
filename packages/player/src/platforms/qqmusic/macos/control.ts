import type { PlayMode } from "../../../types";

/** Mac QQ 音乐「播放模式」子菜单文案（实测 v11.x，仅三项：顺序 / 随机 / 单曲循环） */
export const QQ_MUSIC_PLAY_MODE_LABELS: Record<PlayMode, string> = {
  single: "单曲循环",
  list: "单曲循环",
  random: "随机播放",
  order: "顺序播放",
};

export function resolveQQMacPlayModeLabel(mode: PlayMode): string {
  return QQ_MUSIC_PLAY_MODE_LABELS[mode];
}

/** 
 * QQ 音乐 Mac 客户端控制脚本
 * 兼容中英文菜单，并自动处理进程名
 */

function buildScript(inner: string): string {
  return `
    tell application "System Events"
      set procName to ""
      if exists process "QQMusic" then
        set procName to "QQMusic"
      else if exists process "QQ音乐" then
        set procName to "QQ音乐"
      else
        return "idle"
      end if
      
      tell process procName
        ${inner}
      end tell
    end tell
  `.trim();
}

export function buildQQMusicSetPlayModeScript(mode: PlayMode): string {
  const label = resolveQQMacPlayModeLabel(mode);
  return buildScript(`
    try
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "播放模式" of menu 1 of m then
            click menu item "${label}" of menu 1 of menu item "播放模式" of menu 1 of m
            return "ok"
          end if
        end try
      end repeat
      return "not found"
    on error err
      return "error: " & err
    end try
  `);
}

/** QQ 音乐 Mac 客户端控制（AppleScript） */

export const QQ_MUSIC_PAUSE_SCRIPT = buildScript(`
    try
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "暂停" of menu 1 of m then
            click menu item "暂停" of menu 1 of m
            return "paused"
          else if exists menu item "Pause" of menu 1 of m then
            click menu item "Pause" of menu 1 of m
            return "paused"
          end if
        end try
      end repeat
      return "idle"
    on error
      return "error"
    end try
`);

export const QQ_MUSIC_RESUME_SCRIPT = buildScript(`
    try
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "播放" of menu 1 of m then
            click menu item "播放" of menu 1 of m
            return "resumed"
          else if exists menu item "Play" of menu 1 of m then
            click menu item "Play" of menu 1 of m
            return "resumed"
          end if
        end try
      end repeat
      return "idle"
    on error
      return "error"
    end try
`);

export const QQ_MUSIC_IS_PLAYING_SCRIPT = buildScript(`
    try
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "暂停" of menu 1 of m then return "true"
          if exists menu item "Pause" of menu 1 of m then return "true"
        end try
      end repeat
      return "false"
    on error
      return "false"
    end try
`);

export const QQ_MUSIC_GET_INFO_SCRIPT = buildScript(`
    try
      -- 尝试从窗口标题获取，QQ 音乐 Mac 版窗口标题通常是 "歌手 - 歌曲名"
      set winName to name of window 1
      return winName
    on error
      return "unknown"
    end try
`);

export const PLAY_DETECT_TIMEOUT_MS = 5000;
export const PLAY_DETECT_INTERVAL_MS = 300;
