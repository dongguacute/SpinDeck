use axum::{extract::Multipart, http::StatusCode, response::IntoResponse, Json};
use futures::future::join_all;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::playlist::{self, FULL_LOAD_MAX};
use crate::types::{json_error, SongInfo};

/// Cap parallel playlist fetches when importing multiple URLs at once.
const IMPORT_CONCURRENCY: usize = 3;

fn map_songs(songs: Vec<SongInfo>) -> Vec<SongInfo> {
  songs
    .into_iter()
    .take(FULL_LOAD_MAX)
    .map(|s| SongInfo {
      name: s.name,
      artist: s.artist,
      cover: s.cover,
      album: s.album,
      platform_song_id: s.platform_song_id,
      platform_numeric_id: s.platform_numeric_id,
      platform_song_type: s.platform_song_type,
      duration: None,
    })
    .collect()
}

async fn import_one_url(
  platform: &str,
  url: &str,
  meta_only: bool,
  force_refresh: bool,
  offset: u32,
  limit: u32,
  platform_playlist_id: Option<&str>,
) -> serde_json::Value {
  let result = async {
    if platform == "QQMusic" || platform == "KugouMusic" {
      if meta_only {
        let meta = playlist::get_playlist_meta(platform, url).await?;
        return Ok::<_, String>(json!({
          "url": url,
          "name": meta.name,
          "cover": meta.cover,
          "songCount": meta.song_count,
          "songs": [],
          "offset": 0,
          "limit": 0,
          "hasMore": false,
          "paginated": false,
        }));
      }
      let full = playlist::get_full_playlist(platform, url, force_refresh).await?;
      let songs = map_songs(full.songs);
      let len = songs.len();
      return Ok(json!({
        "url": url,
        "name": full.name,
        "cover": full.cover,
        "songCount": len,
        "songs": songs,
        "offset": 0,
        "limit": len,
        "hasMore": false,
        "paginated": false,
      }));
    }

    if platform == "NetEaseMusic" {
      let page = playlist::get_playlist_page(
        platform,
        url,
        offset,
        limit,
        meta_only,
        platform_playlist_id,
      )
      .await?;
      return Ok(json!({
        "url": url,
        "name": page.name,
        "cover": page.cover,
        "songCount": page.song_count,
        "songs": page.songs,
        "offset": page.offset,
        "limit": page.limit,
        "hasMore": page.has_more,
        "paginated": page.paginated,
        "platformPlaylistId": page.platform_playlist_id,
      }));
    }

    Ok(json!({
      "url": url,
      "name": "Playlist",
      "cover": "",
      "songCount": 0,
      "songs": [],
      "offset": 0,
      "limit": limit,
      "hasMore": false,
      "paginated": false,
      "error": "UNSUPPORTED_PLATFORM",
      "code": "UNSUPPORTED_PLATFORM",
    }))
  }
  .await;

  match result {
    Ok(v) => v,
    Err(code) => {
      let code = if code.contains(':') {
        code.split(':').next().unwrap_or("IMPORT_FAILED")
      } else {
        &code
      };
      json!({
        "url": url,
        "error": code,
        "code": code,
      })
    }
  }
}

async fn read_form(
  mut multipart: Multipart,
) -> Result<std::collections::HashMap<String, String>, String> {
  let mut map = std::collections::HashMap::new();
  while let Some(field) = multipart
    .next_field()
    .await
    .map_err(|_| "INVALID_JSON".to_string())?
  {
    let name = field.name().unwrap_or("").to_string();
    let text = field.text().await.map_err(|_| "INVALID_JSON".to_string())?;
    if !name.is_empty() {
      map.insert(name, text);
    }
  }
  Ok(map)
}

pub async fn import_playlist(multipart: Multipart) -> impl IntoResponse {
  let form = match read_form(multipart).await {
    Ok(f) => f,
    Err(code) => {
      return (StatusCode::BAD_REQUEST, Json(json_error(&code))).into_response();
    }
  };

  let url = form
    .get("url")
    .map(|s| s.trim().to_string())
    .unwrap_or_default();
  let platform = form
    .get("platform")
    .map(|s| s.trim().to_string())
    .unwrap_or_default();
  let meta_only = form.get("metaOnly").map(|s| s.as_str()) == Some("true");
  let force_refresh = form.get("forceRefresh").map(|s| s.as_str()) == Some("true");
  let platform_playlist_id = form
    .get("platformPlaylistId")
    .map(|s| s.trim().to_string())
    .filter(|s| !s.is_empty());

  if url.is_empty() || platform.is_empty() {
    return (StatusCode::BAD_REQUEST, Json(json_error("MISSING_PARAMS"))).into_response();
  }

  let urls: Vec<String> = url
    .split(['\n', ','])
    .map(|s| s.trim().to_string())
    .filter(|s| !s.is_empty())
    .collect();

  if urls.is_empty() {
    return (StatusCode::BAD_REQUEST, Json(json_error("INVALID_URL"))).into_response();
  }

  let offset = form
    .get("offset")
    .and_then(|s| s.parse::<i64>().ok())
    .map(|n| n.max(0) as u32)
    .unwrap_or(0);
  let limit = form
    .get("limit")
    .and_then(|s| s.parse::<i64>().ok())
    .map(|n| n.max(1) as u32)
    .unwrap_or(if meta_only {
      0
    } else {
      playlist::DEFAULT_PAGE_SIZE
    });

  let semaphore = Arc::new(Semaphore::new(IMPORT_CONCURRENCY));
  let results = join_all(urls.iter().cloned().map(|u| {
    let semaphore = Arc::clone(&semaphore);
    let platform = platform.clone();
    let single_id = if urls.len() == 1 {
      platform_playlist_id.clone()
    } else {
      None
    };
    async move {
      let _permit = semaphore.acquire().await.expect("import semaphore closed");
      import_one_url(
        platform.as_str(),
        &u,
        meta_only,
        force_refresh,
        offset,
        limit,
        single_id.as_deref(),
      )
      .await
    }
  }))
  .await;

  (StatusCode::OK, Json(json!({ "results": results }))).into_response()
}
