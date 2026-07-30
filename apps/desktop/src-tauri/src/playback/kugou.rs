use crate::types::{PlayResult, SongInfo, SystemPlaybackStatus};

fn stub_error() -> PlayResult {
  PlayResult {
    ok: false,
    playing: false,
    confirmed: None,
    skipped: None,
    resumed: None,
    error: Some("KUGOU_STUB".into()),
    method: None,
    url: None,
    songid: None,
    stopped: None,
    needs_accessibility: None,
  }
}

pub async fn play_song(_song: &SongInfo) -> PlayResult {
  stub_error()
}

pub async fn pause(_cancel_only: bool) -> PlayResult {
  stub_error()
}

pub async fn resume() -> PlayResult {
  stub_error()
}

pub async fn status() -> SystemPlaybackStatus {
  SystemPlaybackStatus {
    playing: false,
    paused: false,
    idle: true,
    current_song_name: None,
    current_artist_name: None,
  }
}

pub async fn set_play_mode(_mode: &str) -> PlayResult {
  stub_error()
}
