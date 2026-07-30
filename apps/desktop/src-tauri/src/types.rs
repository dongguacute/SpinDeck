//! Shared request/response DTOs for IPC.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SongInfo {
  pub name: String,
  pub artist: String,
  #[serde(default)]
  pub cover: String,
  #[serde(default)]
  pub album: String,
  #[serde(default)]
  pub platform_song_id: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub platform_numeric_id: Option<i64>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub platform_song_type: Option<i64>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub duration: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistMeta {
  pub platform: String,
  pub name: String,
  pub cover: String,
  pub creator: String,
  pub song_count: u32,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub platform_playlist_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistResult {
  pub platform: String,
  pub name: String,
  pub cover: String,
  pub creator: String,
  pub songs: Vec<SongInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayResult {
  pub ok: bool,
  pub playing: bool,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub confirmed: Option<bool>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub skipped: Option<bool>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub resumed: Option<bool>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub error: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub method: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub url: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub songid: Option<i64>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub stopped: Option<bool>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub needs_accessibility: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemPlaybackStatus {
  pub playing: bool,
  pub paused: bool,
  pub idle: bool,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub current_song_name: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub current_artist_name: Option<String>,
}
