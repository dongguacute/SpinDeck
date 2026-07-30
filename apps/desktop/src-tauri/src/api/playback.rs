use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;

use crate::playback;
use crate::types::{json_error, SongInfo};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaySongBody {
  platform: Option<String>,
  song: Option<SongInfo>,
  #[serde(default)]
  fresh: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformBody {
  platform: Option<String>,
  #[serde(default)]
  cancel_only: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetPlayModeBody {
  platform: Option<String>,
  mode: Option<String>,
}

pub async fn play_song(Json(body): Json<PlaySongBody>) -> impl IntoResponse {
  let _ = body.fresh;
  let Some(platform) = body.platform.filter(|s| !s.is_empty()) else {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_SONG"))).into_response();
  };
  let Some(song) = body.song.filter(|s| !s.name.is_empty()) else {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_SONG"))).into_response();
  };

  if (platform == "QQMusic" || platform == "NetEaseMusic") && song.platform_numeric_id.is_none() {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_SONG_ID"))).into_response();
  }

  let result = playback::play_song(&platform, &song).await;
  if !result.ok {
    let code = result.error.as_deref().unwrap_or("PLAY_FAILED");
    let status = if code == "MACOS_ONLY" || code == "MISSING_SONG_ID" {
      StatusCode::BAD_REQUEST
    } else {
      StatusCode::INTERNAL_SERVER_ERROR
    };
    return (
      status,
      Json(serde_json::json!({ "error": code, "code": code })),
    )
      .into_response();
  }
  (StatusCode::OK, Json(result)).into_response()
}

pub async fn stop_song(Json(body): Json<PlatformBody>) -> impl IntoResponse {
  let Some(platform) = body.platform.filter(|s| !s.is_empty()) else {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_PARAMS"))).into_response();
  };
  let cancel_only = body.cancel_only.unwrap_or(false);
  let result = playback::pause_song(&platform, cancel_only).await;

  if result.needs_accessibility == Some(true) {
    return (
      StatusCode::FORBIDDEN,
      Json(serde_json::json!({
        "error": "NEEDS_ACCESSIBILITY",
        "code": "NEEDS_ACCESSIBILITY",
        "needsAccessibility": true
      })),
    )
      .into_response();
  }

  if !result.ok {
    let code = result.error.as_deref().unwrap_or("PAUSE_FAILED");
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(serde_json::json!({ "error": code, "code": code })),
    )
      .into_response();
  }

  (
    StatusCode::OK,
    Json(serde_json::json!({
      "ok": true,
      "stopped": result.stopped
    })),
  )
    .into_response()
}

pub async fn resume_song(Json(body): Json<PlatformBody>) -> impl IntoResponse {
  let Some(platform) = body.platform.filter(|s| !s.is_empty()) else {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_PARAMS"))).into_response();
  };
  let result = playback::resume_song(&platform).await;
  if !result.ok {
    let code = result.error.as_deref().unwrap_or("RESUME_FAILED");
    return (
      StatusCode::INTERNAL_SERVER_ERROR,
      Json(serde_json::json!({ "error": code, "code": code })),
    )
      .into_response();
  }
  (StatusCode::OK, Json(result)).into_response()
}

pub async fn playback_status(Json(body): Json<PlatformBody>) -> impl IntoResponse {
  let platform = body.platform.unwrap_or_default();
  let status = playback::playback_status(&platform).await;
  (StatusCode::OK, Json(status)).into_response()
}

pub async fn set_play_mode(Json(body): Json<SetPlayModeBody>) -> impl IntoResponse {
  let Some(platform) = body.platform.filter(|s| !s.is_empty()) else {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_PARAMS"))).into_response();
  };
  let Some(mode) = body.mode.filter(|s| !s.is_empty()) else {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_PARAMS"))).into_response();
  };
  let result = playback::set_play_mode(&platform, &mode).await;
  if !result.ok {
    let code = result.error.as_deref().unwrap_or("SET_PLAY_MODE_FAILED");
    let status = if code == "MACOS_ONLY" {
      StatusCode::BAD_REQUEST
    } else {
      StatusCode::INTERNAL_SERVER_ERROR
    };
    return (
      status,
      Json(serde_json::json!({ "error": code, "code": code })),
    )
      .into_response();
  }
  (StatusCode::OK, Json(result)).into_response()
}
