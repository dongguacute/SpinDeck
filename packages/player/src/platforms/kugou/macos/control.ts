import type { PlayMode } from "../../../types";

/** 
 * 酷狗音乐 Mac 客户端控制脚本
 * 兼容中英文菜单，并自动处理进程名
 */

function buildScript(inner: string): string {
  return `
    tell application "System Events"
      set procName to ""
      if exists process "KugouMusic" then
        set procName to "KugouMusic"
      else if exists process "酷狗音乐" then
        set procName to "酷狗音乐"
      else
        return "idle"
      end if
      
      tell process procName
        ${inner}
      end tell
    end tell
  `.trim();
}

export function buildKugouMusicSetPlayModeScript(mode: PlayMode): string {
  return buildScript(`
    try
      -- 尝试寻找播放模式菜单
      set found to false
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "播放模式" of menu 1 of m then
            set targetLabel to ""
            if "${mode}" is "single" then set targetLabel to "单曲循环"
            if "${mode}" is "list" then set targetLabel to "列表循环"
            if "${mode}" is "random" then set targetLabel to "随机播放"
            if "${mode}" is "order" then set targetLabel to "顺序播放"
            click menu item targetLabel of menu 1 of menu item "播放模式" of menu 1 of m
            set found to true
            exit repeat
          else if exists menu item "Playback Mode" of menu 1 of m then
            set targetLabel to ""
            if "${mode}" is "single" then set targetLabel to "Single Cycle"
            if "${mode}" is "list" then set targetLabel to "List Cycle"
            if "${mode}" is "random" then set targetLabel to "Shuffle"
            if "${mode}" is "order" then set targetLabel to "Order Play"
            click menu item targetLabel of menu 1 of menu item "Playback Mode" of menu 1 of m
            set found to true
            exit repeat
          end if
        try
      end repeat
      if found then return "ok"
      return "not found"
    on error err
      return "error: " & err
    end try
  `);
}

export const KUGOU_MUSIC_PAUSE_SCRIPT = buildScript(`
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

export const KUGOU_MUSIC_RESUME_SCRIPT = buildScript(`
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
        try
      end repeat
      return "idle"
    on error
      return "error"
    end try
`);

export const KUGOU_MUSIC_IS_PLAYING_SCRIPT = buildScript(`
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

export const KUGOU_MUSIC_GET_INFO_SCRIPT = buildScript(`
    try
      set winName to name of window 1
      return winName
    on error
      return "unknown"
    end try
`);

export const PLAY_DETECT_TIMEOUT_MS = 5000;
export const PLAY_DETECT_INTERVAL_MS = 300;
