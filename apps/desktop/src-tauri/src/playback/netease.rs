use crate::types::{PlayResult, SongInfo, SystemPlaybackStatus};
use base64::{engine::general_purpose::STANDARD, Engine};

use super::osascript::{needs_accessibility_output, open_url, run_osascript};

const PLAY_DETECT_TIMEOUT_MS: u64 = 5000;
const PLAY_DETECT_INTERVAL_MS: u64 = 300;

fn build_script(inner: &str) -> String {
  format!(
    r#"tell application "System Events"
      set procName to ""
      if exists process "NeteaseMusic" then
        set procName to "NeteaseMusic"
      else if exists process "网易云音乐" then
        set procName to "网易云音乐"
      else
        return "idle"
      end if
      
      tell process procName
        {inner}
      end tell
    end tell"#
  )
}

fn pause_script() -> String {
  build_script(
    r#"
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
    on error err
      return "error:" & err
    end try
"#,
  )
}

fn resume_script() -> String {
  build_script(
    r#"
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
    on error err
      return "error:" & err
    end try
"#,
  )
}

fn is_playing_script() -> String {
  build_script(
    r#"
    try
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
"#,
  )
}

fn get_info_script() -> String {
  build_script(
    r#"
    try
      set winName to name of window 1
      return winName
    on error
      return "unknown"
    end try
"#,
  )
}

fn set_play_mode_script(mode: &str) -> String {
  build_script(&format!(
    r#"
    try
      set found to false
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "播放模式" of menu 1 of m then
            set targetLabel to ""
            if "{mode}" is "single" then set targetLabel to "单曲循环"
            if "{mode}" is "list" then set targetLabel to "列表循环"
            if "{mode}" is "random" then set targetLabel to "随机播放"
            if "{mode}" is "order" then set targetLabel to "顺序播放"
            click menu item targetLabel of menu 1 of menu item "播放模式" of menu 1 of m
            set found to true
            exit repeat
          else if exists menu item "Repeat" of menu 1 of m then
            if "{mode}" is "random" then
              click menu item "Shuffle" of menu 1 of m
            else
              set targetLabel to ""
              if "{mode}" is "single" then set targetLabel to "One"
              if "{mode}" is "list" then set targetLabel to "All"
              if "{mode}" is "order" then set targetLabel to "Off"
              click menu item targetLabel of menu 1 of menu item "Repeat" of menu 1 of m
            end if
            set found to true
            exit repeat
          end if
        end try
      end repeat
      if found then return "ok"
      return "not found"
    on error err
      return "error: " & err
    end try
"#
  ))
}

fn play_url(song: &SongInfo) -> Option<String> {
  let id = song
    .platform_numeric_id
    .map(|n| n.to_string())
    .or_else(|| {
      let s = song.platform_song_id.trim();
      if s.is_empty() {
        None
      } else {
        Some(s.to_string())
      }
    })?;
  let payload = serde_json::json!({
    "type": "song",
    "id": id,
    "cmd": "play"
  })
  .to_string();
  let b64 = STANDARD.encode(payload.as_bytes());
  Some(format!("orpheus://{b64}"))
}

async fn is_playing() -> bool {
  match run_osascript(&is_playing_script()).await {
    Ok(out) => out == "true",
    Err(_) => false,
  }
}

async fn wait_for_playing() -> bool {
  if is_playing().await {
    return true;
  }
  let polls = PLAY_DETECT_TIMEOUT_MS / PLAY_DETECT_INTERVAL_MS;
  for _ in 0..polls {
    tokio::time::sleep(std::time::Duration::from_millis(PLAY_DETECT_INTERVAL_MS)).await;
    if is_playing().await {
      return true;
    }
  }
  false
}

pub async fn play_song(song: &SongInfo) -> PlayResult {
  let Some(id) = song.platform_numeric_id else {
    return PlayResult {
      ok: false,
      playing: false,
      confirmed: None,
      skipped: None,
      resumed: None,
      error: Some("MISSING_SONG_ID".into()),
      method: None,
      url: None,
      songid: None,
      stopped: None,
      needs_accessibility: None,
    };
  };
  let Some(url) = play_url(song) else {
    return PlayResult {
      ok: false,
      playing: false,
      confirmed: None,
      skipped: None,
      resumed: None,
      error: Some("PLAY_FAILED".into()),
      method: None,
      url: None,
      songid: None,
      stopped: None,
      needs_accessibility: None,
    };
  };

  if open_url(&["-g", "-b", "com.netease.163music", &url])
    .await
    .is_err()
  {
    return PlayResult {
      ok: false,
      playing: false,
      confirmed: None,
      skipped: None,
      resumed: None,
      error: Some("PLAY_FAILED".into()),
      method: None,
      url: Some(url),
      songid: Some(id),
      stopped: None,
      needs_accessibility: None,
    };
  }

  tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
  let confirmed = wait_for_playing().await;
  PlayResult {
    ok: true,
    playing: confirmed,
    confirmed: Some(confirmed),
    skipped: None,
    resumed: None,
    error: None,
    method: Some("playsong".into()),
    url: Some(url),
    songid: Some(id),
    stopped: None,
    needs_accessibility: None,
  }
}

pub async fn pause(cancel_only: bool) -> PlayResult {
  if cancel_only {
    return PlayResult {
      ok: true,
      playing: false,
      confirmed: None,
      skipped: None,
      resumed: None,
      error: None,
      method: Some("cancel".into()),
      url: None,
      songid: None,
      stopped: Some(false),
      needs_accessibility: None,
    };
  }

  let pause_output = run_osascript(&pause_script()).await.unwrap_or_default();
  let stopped = pause_output == "paused";

  if !stopped && needs_accessibility_output(&pause_output) {
    return PlayResult {
      ok: false,
      playing: false,
      confirmed: None,
      skipped: None,
      resumed: None,
      error: Some("NEEDS_ACCESSIBILITY".into()),
      method: Some("needs-accessibility".into()),
      url: None,
      songid: None,
      stopped: Some(false),
      needs_accessibility: Some(true),
    };
  }

  PlayResult {
    ok: true,
    playing: false,
    confirmed: None,
    skipped: None,
    resumed: None,
    error: None,
    method: Some(if stopped { "pause" } else { "idle" }.into()),
    url: None,
    songid: None,
    stopped: Some(stopped),
    needs_accessibility: None,
  }
}

pub async fn resume() -> PlayResult {
  let resumed = run_osascript(&resume_script())
    .await
    .map(|o| o == "resumed")
    .unwrap_or(false);
  let already_playing = !resumed && wait_for_playing().await;
  let playing = if resumed {
    wait_for_playing().await
  } else {
    already_playing
  };

  PlayResult {
    ok: true,
    playing: playing || already_playing,
    confirmed: Some(playing),
    skipped: None,
    resumed: Some(true),
    error: None,
    method: Some("resume".into()),
    url: None,
    songid: None,
    stopped: None,
    needs_accessibility: None,
  }
}

pub async fn status() -> SystemPlaybackStatus {
  let playing = is_playing().await;
  let mut current_song_name = None;
  let mut current_artist_name = None;
  if playing {
    if let Ok(info) = run_osascript(&get_info_script()).await {
      if info != "unknown" && info != "idle" {
        if let Some((song, artist)) = info.split_once(" - ") {
          current_song_name = Some(song.trim().to_string());
          current_artist_name = Some(artist.trim().to_string());
        } else {
          current_song_name = Some(info);
        }
      }
    }
  }
  SystemPlaybackStatus {
    playing,
    paused: !playing,
    idle: !playing,
    current_song_name,
    current_artist_name,
  }
}

pub async fn set_play_mode(mode: &str) -> PlayResult {
  let applied = run_osascript(&set_play_mode_script(mode))
    .await
    .map(|o| o == "ok")
    .unwrap_or(false);
  PlayResult {
    ok: true,
    playing: false,
    confirmed: Some(applied),
    skipped: None,
    resumed: None,
    error: None,
    method: Some("set-play-mode".into()),
    url: None,
    songid: None,
    stopped: None,
    needs_accessibility: None,
  }
}
