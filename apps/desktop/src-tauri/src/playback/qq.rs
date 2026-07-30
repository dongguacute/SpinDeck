use crate::types::{PlayResult, SongInfo, SystemPlaybackStatus};

use super::osascript::{needs_accessibility_output, open_url, run_osascript};

const PLAY_DETECT_TIMEOUT_MS: u64 = 5000;
const PLAY_DETECT_INTERVAL_MS: u64 = 300;

fn build_script(inner: &str) -> String {
  format!(
    r#"tell application "System Events"
      set procName to ""
      if exists process "QQMusic" then
        set procName to "QQMusic"
      else if exists process "QQ音乐" then
        set procName to "QQ音乐"
      else
        return "idle"
      end if
      
      tell process procName
        {inner}
      end tell
    end tell"#
  )
}

const PLAYBACK_MENU_PAUSE: &str = r#"
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
"#;

const PLAYBACK_MENU_RESUME: &str = r#"
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
"#;

const PLAYBACK_MENU_IS_PLAYING: &str = r#"
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
"#;

fn pause_script() -> String {
  build_script(&format!(
    r#"
    try
      {PLAYBACK_MENU_PAUSE}
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
"#
  ))
}

fn resume_script() -> String {
  build_script(&format!(
    r#"
    try
      {PLAYBACK_MENU_RESUME}
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
"#
  ))
}

fn is_playing_script() -> String {
  build_script(&format!(
    r#"
    try
      {PLAYBACK_MENU_IS_PLAYING}
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
"#
  ))
}

fn pause_keyboard_script() -> String {
  build_script(
    r#"
    try
      set frontmost to true
      delay 0.05
      keystroke space
      delay 0.12
      return "paused"
    on error
      return "error"
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
  let label = match mode {
    "random" => "随机播放",
    "order" => "顺序播放",
    _ => "单曲循环", // single / list
  };
  build_script(&format!(
    r#"
    try
      repeat with m in menu bar items of menu bar 1
        try
          if exists menu item "播放模式" of menu 1 of m then
            click menu item "{label}" of menu 1 of menu item "播放模式" of menu 1 of m
            return "ok"
          end if
        end try
      end repeat
      return "not found"
    on error err
      return "error: " & err
    end try
"#
  ))
}

fn play_url(song: &SongInfo) -> Option<String> {
  song.platform_numeric_id.map(|id| {
    format!("qqmusicmac://QQMusic/?version==73270&&cmd_count==1&&cmd_0==playsong&&id_0=={id}")
  })
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

  if open_url(&["-g", &url]).await.is_err() {
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

  let confirmed = wait_for_playing().await;
  PlayResult {
    ok: true,
    playing: true,
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

  if !is_playing().await {
    return PlayResult {
      ok: true,
      playing: false,
      confirmed: None,
      skipped: None,
      resumed: None,
      error: None,
      method: Some("idle".into()),
      url: None,
      songid: None,
      stopped: Some(false),
      needs_accessibility: None,
    };
  }

  let pause_output = run_osascript(&pause_script()).await.unwrap_or_default();
  let mut stopped = pause_output == "paused";

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

  if !stopped {
    let _ = run_osascript(&pause_keyboard_script()).await;
    stopped = !is_playing().await;
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
        if let Some((artist, song)) = info.split_once(" - ") {
          current_artist_name = Some(artist.trim().to_string());
          current_song_name = Some(song.trim().to_string());
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
