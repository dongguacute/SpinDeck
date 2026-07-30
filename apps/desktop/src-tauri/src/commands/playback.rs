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
    log::warn!("play_song rejected: MISSING_SONG");
    return Err("MISSING_SONG".to_string());
  }

  if (platform == "QQMusic" || platform == "NetEaseMusic") && song.platform_numeric_id.is_none() {
    log::warn!(
      "play_song rejected: MISSING_SONG_ID platform={platform} song={}",
      song.name
    );
    return Err("MISSING_SONG_ID".to_string());
  }

  log::info!("play_song platform={platform} song={}", song.name);
  let result = playback::play_song(platform, &song).await;
  if !result.ok {
    let code = result
      .error
      .clone()
      .unwrap_or_else(|| "PLAY_FAILED".to_string());
    log::warn!(
      "play_song failed platform={platform} song={} code={code}",
      song.name
    );
    return Err(code);
  }
  Ok(result)
}

#[tauri::command]
pub async fn pause_song(platform: String, cancel_only: Option<bool>) -> Result<PlayResult, String> {
  let platform = platform.trim();
  if platform.is_empty() {
    log::warn!("pause_song rejected: MISSING_PARAMS");
    return Err("MISSING_PARAMS".to_string());
  }
  let cancel_only = cancel_only.unwrap_or(false);
  log::info!("pause_song platform={platform} cancel_only={cancel_only}");
  let result = playback::pause_song(platform, cancel_only).await;

  if result.needs_accessibility == Some(true) {
    log::warn!("pause_song needs accessibility platform={platform}");
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
    let code = result
      .error
      .clone()
      .unwrap_or_else(|| "PAUSE_FAILED".to_string());
    log::warn!("pause_song failed platform={platform} code={code}");
    return Err(code);
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
    log::warn!("resume_song rejected: MISSING_PARAMS");
    return Err("MISSING_PARAMS".to_string());
  }
  log::info!("resume_song platform={platform}");
  let result = playback::resume_song(platform).await;
  if !result.ok {
    let code = result
      .error
      .clone()
      .unwrap_or_else(|| "RESUME_FAILED".to_string());
    log::warn!("resume_song failed platform={platform} code={code}");
    return Err(code);
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
    log::warn!("set_play_mode rejected: MISSING_PARAMS");
    return Err("MISSING_PARAMS".to_string());
  }
  log::info!("set_play_mode platform={platform} mode={mode}");
  let result = playback::set_play_mode(platform, mode).await;
  if !result.ok {
    let code = result
      .error
      .clone()
      .unwrap_or_else(|| "SET_PLAY_MODE_FAILED".to_string());
    log::warn!("set_play_mode failed platform={platform} mode={mode} code={code}");
    return Err(code);
  }
  Ok(result)
}
