//! Local music-app playback control.
//!
//! On macOS this drives QQ / NetEase / Kugou via AppleScript (`osascript`) and
//! `open`. Other platforms return `MACOS_ONLY` — the web client uses deep links instead.

mod kugou;
mod netease;
mod osascript;
mod qq;

use crate::types::{PlayResult, SongInfo, SystemPlaybackStatus};

#[cfg(not(target_os = "macos"))]
fn macos_only() -> PlayResult {
  PlayResult {
    ok: false,
    playing: false,
    confirmed: None,
    skipped: None,
    resumed: None,
    error: Some("MACOS_ONLY".into()),
    method: None,
    url: None,
    songid: None,
    stopped: None,
    needs_accessibility: None,
  }
}

fn idle_status() -> SystemPlaybackStatus {
  SystemPlaybackStatus {
    playing: false,
    paused: false,
    idle: true,
    current_song_name: None,
    current_artist_name: None,
  }
}

pub async fn play_song(platform: &str, song: &SongInfo) -> PlayResult {
  #[cfg(not(target_os = "macos"))]
  {
    let _ = (platform, song);
    log::info!("play_song skipped: MACOS_ONLY platform={platform}");
    return macos_only();
  }
  #[cfg(target_os = "macos")]
  {
    let result = match platform {
      "QQMusic" => qq::play_song(song).await,
      "NetEaseMusic" => netease::play_song(song).await,
      "KugouMusic" => kugou::play_song(song).await,
      _ => PlayResult {
        ok: true,
        playing: false,
        confirmed: None,
        skipped: None,
        resumed: None,
        error: None,
        method: Some("noop".into()),
        url: None,
        songid: None,
        stopped: None,
        needs_accessibility: None,
      },
    };
    if !result.ok {
      log::warn!(
        "playback play_song failed platform={platform} error={:?}",
        result.error
      );
    }
    result
  }
}

pub async fn pause_song(platform: &str, cancel_only: bool) -> PlayResult {
  #[cfg(not(target_os = "macos"))]
  {
    let _ = (platform, cancel_only);
    return macos_only();
  }
  #[cfg(target_os = "macos")]
  {
    match platform {
      "QQMusic" => qq::pause(cancel_only).await,
      "NetEaseMusic" => netease::pause(cancel_only).await,
      "KugouMusic" => kugou::pause(cancel_only).await,
      _ => PlayResult {
        ok: true,
        playing: false,
        confirmed: None,
        skipped: None,
        resumed: None,
        error: None,
        method: None,
        url: None,
        songid: None,
        stopped: Some(false),
        needs_accessibility: None,
      },
    }
  }
}

pub async fn resume_song(platform: &str) -> PlayResult {
  #[cfg(not(target_os = "macos"))]
  {
    let _ = platform;
    return macos_only();
  }
  #[cfg(target_os = "macos")]
  {
    match platform {
      "QQMusic" => qq::resume().await,
      "NetEaseMusic" => netease::resume().await,
      "KugouMusic" => kugou::resume().await,
      _ => PlayResult {
        ok: true,
        playing: false,
        confirmed: None,
        skipped: None,
        resumed: None,
        error: None,
        method: Some("noop".into()),
        url: None,
        songid: None,
        stopped: None,
        needs_accessibility: None,
      },
    }
  }
}

pub async fn playback_status(platform: &str) -> SystemPlaybackStatus {
  #[cfg(not(target_os = "macos"))]
  {
    let _ = platform;
    return idle_status();
  }
  #[cfg(target_os = "macos")]
  {
    match platform {
      "QQMusic" => qq::status().await,
      "NetEaseMusic" => netease::status().await,
      "KugouMusic" => kugou::status().await,
      _ => idle_status(),
    }
  }
}

pub async fn set_play_mode(platform: &str, mode: &str) -> PlayResult {
  #[cfg(not(target_os = "macos"))]
  {
    let _ = (platform, mode);
    return macos_only();
  }
  #[cfg(target_os = "macos")]
  {
    match platform {
      "QQMusic" => qq::set_play_mode(mode).await,
      "NetEaseMusic" => netease::set_play_mode(mode).await,
      "KugouMusic" => kugou::set_play_mode(mode).await,
      _ => PlayResult {
        ok: true,
        playing: false,
        confirmed: None,
        skipped: None,
        resumed: None,
        error: None,
        method: Some("noop".into()),
        url: None,
        songid: None,
        stopped: None,
        needs_accessibility: None,
      },
    }
  }
}
