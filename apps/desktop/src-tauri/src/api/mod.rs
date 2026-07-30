pub mod image;
pub mod import;
pub mod playback;

use axum::{
  routing::{get, post},
  Router,
};

pub fn router() -> Router {
  Router::new()
    .route("/api/import", post(import::import_playlist))
    .route("/api/image", get(image::proxy_image))
    .route("/api/play-song", post(playback::play_song))
    .route("/api/stop-song", post(playback::stop_song))
    .route("/api/resume-song", post(playback::resume_song))
    .route("/api/playback-status", post(playback::playback_status))
    .route("/api/set-play-mode", post(playback::set_play_mode))
}
