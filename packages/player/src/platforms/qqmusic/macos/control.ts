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
 * 兼容 v8+「播放控制」菜单、旧版顶层「暂停/播放」菜单，以及中英文界面
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

/** v8+：在「播放控制 / Playback」子菜单中点击暂停项（没播放时返回 idle 不误触播放） */
const PLAYBACK_MENU_PAUSE = `
      try
        if exists menu bar item "播放控制" of menu bar 1 then
          tell menu "播放控制" of menu bar item "播放控制" of menu bar 1
            if exists menu item "暂停" then
              click menu item "暂停"
              return "paused"
            else if exists menu item "Pause" then
              click menu item "Pause"
              return "paused"
            else
              return "idle"
            end if
          end tell
        else if exists menu bar item "Playback" of menu bar 1 then
          tell menu "Playback" of menu bar item "Playback" of menu bar 1
            if exists menu item "暂停" then
              click menu item "暂停"
              return "paused"
            else if exists menu item "Pause" then
              click menu item "Pause"
              return "paused"
            else
              return "idle"
            end if
          end tell
        end if
      end try
`.trim();

/** v8+：在「播放控制 / Playback」子菜单中点击播放项（或首项 toggle） */
const PLAYBACK_MENU_RESUME = `
      try
        if exists menu bar item "播放控制" of menu bar 1 then
          tell menu "播放控制" of menu bar item "播放控制" of menu bar 1
            if exists menu item "播放" then
              click menu item "播放"
              return "resumed"
            else if exists menu item "Play" then
              click menu item "Play"
              return "resumed"
            else
              click menu item 1
              return "resumed"
            end if
          end tell
        else if exists menu bar item "Playback" of menu bar 1 then
          tell menu "Playback" of menu bar item "Playback" of menu bar 1
            if exists menu item "播放" then
              click menu item "播放"
              return "resumed"
            else if exists menu item "Play" then
              click menu item "Play"
              return "resumed"
            else
              click menu item 1
              return "resumed"
            end if
          end tell
        end if
      end try
`.trim();

/** v8+：检测「播放控制」菜单是否显示暂停项 */
const PLAYBACK_MENU_IS_PLAYING = `
      try
        if exists menu bar item "播放控制" of menu bar 1 then
          tell menu "播放控制" of menu bar item "播放控制" of menu bar 1
            if exists menu item "暂停" then return "true"
            if exists menu item "Pause" then return "true"
          end tell
        else if exists menu bar item "Playback" of menu bar 1 then
          tell menu "Playback" of menu bar item "Playback" of menu bar 1
            if exists menu item "暂停" then return "true"
            if exists menu item "Pause" then return "true"
          end tell
        end if
      end try
`.trim();

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
      ${PLAYBACK_MENU_PAUSE}
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
    on error err
      return "error:" & err
    end try
`);

export const QQ_MUSIC_RESUME_SCRIPT = buildScript(`
    try
      ${PLAYBACK_MENU_RESUME}
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
      try
        click menu item 1 of menu 1 of menu bar item 4 of menu bar 1
        return "resumed"
      end try
      return "idle"
    on error err
      return "error:" & err
    end try
`);

export const QQ_MUSIC_IS_PLAYING_SCRIPT = buildScript(`
    try
      ${PLAYBACK_MENU_IS_PLAYING}
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "暂停" of menu 1 of m then return "true"
          if exists menu item "Pause" of menu 1 of m then return "true"
        end try
      end repeat
      return "false"
    on error err
      return "error:" & err
    end try
`);

/** 菜单点击失败时：聚焦 QQ 音乐并发送空格（播放/暂停快捷键） */
export const QQ_MUSIC_PAUSE_KEYBOARD_SCRIPT = buildScript(`
    try
      set frontmost to true
      delay 0.05
      keystroke space
      delay 0.12
      return "paused"
    on error
      return "error"
    end try
`);

export const QQ_MUSIC_GET_INFO_SCRIPT = buildScript(`
    try
      set winName to name of window 1
      return winName
    on error
      return "unknown"
    end try
`);

export const PLAY_DETECT_TIMEOUT_MS = 5000;
export const PLAY_DETECT_INTERVAL_MS = 300;
