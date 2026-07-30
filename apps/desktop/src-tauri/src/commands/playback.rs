use crate::playback;
use crate::types::{PlayResult, SongInfo, SystemPlaybackStatus};

#[tauri::command]
pub async fn play_song(
  platform: String,
  song: SongInfo,
  fresh: Option<bool>,
) -> Result<PlayResult, String> {
  let _ = fresh;
  let platform = platform.trim();
  if platform.is_empty() || song.name.is_empty() {
    return Err("MISSING_SONG".to_string());
  }

  if (platform == "QQMusic" || platform == "NetEaseMusic") && song.platform_numeric_id.is_none() {
    return Err("MISSING_SONG_ID".to_string());
  }

  let result = playback::play_song(platform, &song).await;
  if !result.ok {
    return Err(result.error.unwrap_or_else(|| "PLAY_FAILED".to_string()));
  }
  Ok(result)
}

#[tauri::command]
pub async fn pause_song(platform: String, cancel_only: Option<bool>) -> Result<PlayResult, String> {
  let platform = platform.trim();
  if platform.is_empty() {
    return Err("MISSING_PARAMS".to_string());
  }
  let cancel_only = cancel_only.unwrap_or(false);
  let result = playback::pause_song(platform, cancel_only).await;

  if result.needs_accessibility == Some(true) {
    return Ok(PlayResult {
      ok: false,
      playing: false,
      confirmed: None,
      skipped: None,
      resumed: None,
      error: Some("NEEDS_ACCESSIBILITY".to_string()),
      method: None,
      url: None,
      songid: None,
      stopped: result.stopped,
      needs_accessibility: Some(true),
    });
  }

  if !result.ok {
    return Err(result.error.unwrap_or_else(|| "PAUSE_FAILED".to_string()));
  }

  Ok(PlayResult {
    ok: true,
    playing: false,
    confirmed: None,
    skipped: None,
    resumed: None,
    error: None,
    method: None,
    url: None,
    songid: None,
    stopped: result.stopped,
    needs_accessibility: None,
  })
}

#[tauri::command]
pub async fn resume_song(platform: String) -> Result<PlayResult, String> {
  let platform = platform.trim();
  if platform.is_empty() {
    return Err("MISSING_PARAMS".to_string());
  }
  let result = playback::resume_song(platform).await;
  if !result.ok {
    return Err(result.error.unwrap_or_else(|| "RESUME_FAILED".to_string()));
  }
  Ok(result)
}

#[tauri::command]
pub async fn playback_status(platform: String) -> Result<SystemPlaybackStatus, String> {
  Ok(playback::playback_status(platform.trim()).await)
}

#[tauri::command]
pub async fn set_play_mode(platform: String, mode: String) -> Result<PlayResult, String> {
  let platform = platform.trim();
  let mode = mode.trim();
  if platform.is_empty() || mode.is_empty() {
    return Err("MISSING_PARAMS".to_string());
  }
  let result = playback::set_play_mode(platform, mode).await;
  if !result.ok {
    return Err(
      result
        .error
        .unwrap_or_else(|| "SET_PLAY_MODE_FAILED".to_string()),
    );
  }
  Ok(result)
}
