//! Playlist import: fetch metadata and songs from music platforms.

pub mod cache;
pub mod kugou;
pub mod netease;
pub mod qq;

use crate::types::{PlaylistMeta, PlaylistResult, SongInfo};
use crate::util;

pub const FULL_LOAD_MAX: usize = 300;
pub const DEFAULT_PAGE_SIZE: u32 = 30;

#[derive(Debug, Clone)]
pub struct PlaylistPage {
  pub name: String,
  pub cover: String,
  pub song_count: u32,
  pub songs: Vec<SongInfo>,
  pub offset: u32,
  pub limit: u32,
  pub has_more: bool,
  pub paginated: bool,
  pub platform_playlist_id: Option<String>,
}

pub fn is_paginated(platform: &str) -> bool {
  platform == "NetEaseMusic"
}

pub async fn get_playlist_meta(platform: &str, url: &str) -> Result<PlaylistMeta, String> {
  let result = match platform {
    "QQMusic" => qq::get_meta(url).await,
    "NetEaseMusic" => netease::get_meta(url).await,
    "KugouMusic" => kugou::get_meta(url).await,
    _ => Err("UNSUPPORTED_PLATFORM".into()),
  };
  if let Err(ref code) = result {
    log::warn!("get_playlist_meta failed platform={platform} code={code}");
  }
  result
}

pub async fn get_full_playlist(
  platform: &str,
  url: &str,
  force_refresh: bool,
) -> Result<PlaylistResult, String> {
  let result = match platform {
    "QQMusic" => qq::get_songs(url, force_refresh).await,
    "KugouMusic" => kugou::get_songs(url, force_refresh).await,
    _ => Err("UNSUPPORTED_PLATFORM".into()),
  };
  if let Err(ref code) = result {
    log::warn!("get_full_playlist failed platform={platform} code={code}");
  }
  result
}

pub async fn get_playlist_page(
  platform: &str,
  url: &str,
  offset: u32,
  limit: u32,
  meta_only: bool,
  platform_playlist_id: Option<&str>,
) -> Result<PlaylistPage, String> {
  if meta_only {
    let meta = get_playlist_meta(platform, url).await?;
    return Ok(PlaylistPage {
      name: meta.name,
      cover: meta.cover,
      song_count: meta.song_count,
      songs: vec![],
      offset,
      limit: 0,
      has_more: meta.song_count > 0 && is_paginated(platform),
      paginated: is_paginated(platform),
      platform_playlist_id: meta
        .platform_playlist_id
        .or_else(|| platform_playlist_id.map(|s| s.to_string())),
    });
  }

  if !is_paginated(platform) {
    let result = get_full_playlist(platform, url, false).await?;
    let songs: Vec<_> = result.songs.into_iter().take(FULL_LOAD_MAX).collect();
    let len = songs.len() as u32;
    return Ok(PlaylistPage {
      name: result.name,
      cover: result.cover,
      song_count: len,
      songs,
      offset: 0,
      limit: len,
      has_more: false,
      paginated: false,
      platform_playlist_id: None,
    });
  }

  let safe_limit = limit.max(1);
  let page = netease::get_page(url, offset, safe_limit, platform_playlist_id).await?;
  Ok(page)
}

/// Re-export for providers that previously imported from this module.
pub use util::{http_client, http_client_follow};
