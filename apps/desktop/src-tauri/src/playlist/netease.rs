use once_cell::sync::Lazy;
use regex::Regex;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use super::http_client;
use super::PlaylistPage;
use crate::types::{PlaylistMeta, SongInfo};
use crate::util::decode_html_entities;

static PLAYLIST_ID_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"id=(\d+)").unwrap());

/// How many tracks to ask the detail API to embed. `trackIds` is always complete;
/// `n` only caps the hydrated `tracks` array (not used as a page size).
const DETAIL_TRACK_N: u32 = 1000;
/// `s` is “recent collectors”, not an offset — keep a small fixed value.
const DETAIL_COLLECTORS_S: u32 = 8;
/// song/detail accepts large batches, but keep requests modest.
const SONG_DETAIL_CHUNK: usize = 100;

#[derive(Debug, Deserialize)]
struct NeteaseResponse {
  code: i64,
  msg: Option<String>,
  message: Option<String>,
  playlist: Option<NeteasePlaylist>,
}

#[derive(Debug, Clone, Deserialize)]
struct NeteasePlaylist {
  id: Option<i64>,
  name: Option<String>,
  #[serde(rename = "coverImgUrl")]
  cover_img_url: Option<String>,
  #[serde(rename = "trackCount")]
  track_count: Option<u32>,
  creator: Option<NeteaseCreator>,
  tracks: Option<Vec<NeteaseTrack>>,
  #[serde(rename = "trackIds")]
  track_ids: Option<Vec<NeteaseTrackId>>,
}

#[derive(Debug, Clone, Deserialize)]
struct NeteaseCreator {
  nickname: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct NeteaseTrackId {
  id: i64,
}

#[derive(Debug, Clone, Deserialize)]
struct NeteaseTrack {
  name: Option<String>,
  id: i64,
  ar: Option<Vec<NeteaseArtist>>,
  artists: Option<Vec<NeteaseArtist>>,
  al: Option<NeteaseAlbum>,
  album: Option<NeteaseAlbum>,
  dt: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
struct NeteaseArtist {
  name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct NeteaseAlbum {
  name: Option<String>,
  #[serde(rename = "picUrl")]
  pic_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SongDetailResponse {
  code: i64,
  msg: Option<String>,
  message: Option<String>,
  songs: Option<Vec<NeteaseTrack>>,
}

struct PlaylistCacheEntry {
  expires: Instant,
  playlist: NeteasePlaylist,
}

static PLAYLIST_CACHE: Lazy<Mutex<HashMap<String, PlaylistCacheEntry>>> =
  Lazy::new(|| Mutex::new(HashMap::new()));

const PLAYLIST_TTL: Duration = Duration::from_secs(60);
const PLAYLIST_MAX_ENTRIES: usize = 8;

fn prune_playlist_cache(map: &mut HashMap<String, PlaylistCacheEntry>) {
  let now = Instant::now();
  map.retain(|_, entry| now < entry.expires);
  while map.len() > PLAYLIST_MAX_ENTRIES {
    let victim = map
      .iter()
      .min_by_key(|(_, e)| e.expires)
      .map(|(k, _)| k.clone());
    if let Some(key) = victim {
      map.remove(&key);
    } else {
      break;
    }
  }
}

fn netease_headers() -> [(&'static str, &'static str); 2] {
  [
    (
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ),
    ("Referer", "https://music.163.com/"),
  ]
}

fn assert_code(code: i64, msg: Option<&str>) -> Result<(), String> {
  if code == 200 {
    return Ok(());
  }
  if code == 405 {
    return Err("RATE_LIMITED".into());
  }
  let _ = msg;
  Err("UPSTREAM_ERROR".into())
}

async fn resolve_playlist_id(url: &str) -> Result<String, String> {
  let mut resolved = url.trim().to_string();
  if resolved.contains("163cn.tv") || resolved.contains("music.163.com/m/") {
    let client = http_client()?;
    if let Ok(res) = client.get(&resolved).send().await {
      if let Some(loc) = res.headers().get("location").and_then(|v| v.to_str().ok()) {
        resolved = loc.to_string();
      }
    }
  }

  let normalized = resolved.replace("/#/", "/");
  if let Ok(parsed) = url::Url::parse(&normalized) {
    if let Some((_, id)) = parsed.query_pairs().find(|(k, _)| k == "id") {
      return Ok(id.to_string());
    }
  }

  let re = &*PLAYLIST_ID_RE;
  if let Some(caps) = re.captures(&resolved) {
    return Ok(caps[1].to_string());
  }
  Err("PARSE_ID_FAILED".into())
}

fn normalize_cover(url: Option<&str>) -> String {
  url
    .unwrap_or("")
    .replacen("http://", "https://", 1)
    .to_string()
}

fn parse_tracks(tracks: &[NeteaseTrack]) -> Vec<SongInfo> {
  tracks
    .iter()
    .map(|item| {
      let album = item.al.as_ref().or(item.album.as_ref());
      let artists = item
        .ar
        .as_ref()
        .or(item.artists.as_ref())
        .map(|list| {
          list
            .iter()
            .filter_map(|a| a.name.as_ref())
            .map(|n| decode_html_entities(n))
            .filter(|n| !n.is_empty())
            .collect::<Vec<_>>()
        })
        .unwrap_or_default();
      let artist = if artists.is_empty() {
        "Unknown".into()
      } else {
        artists.join(" / ")
      };
      SongInfo {
        name: decode_html_entities(item.name.as_deref().unwrap_or("")),
        cover: normalize_cover(album.and_then(|a| a.pic_url.as_deref())),
        artist,
        album: decode_html_entities(album.and_then(|a| a.name.as_deref()).unwrap_or("")),
        platform_song_id: item.id.to_string(),
        platform_numeric_id: Some(item.id),
        platform_song_type: None,
        duration: item.dt.map(|ms| ms / 1000),
      }
    })
    .collect()
}

fn meta_from_playlist(playlist: &NeteasePlaylist, id: &str) -> PlaylistMeta {
  PlaylistMeta {
    platform: "NetEaseMusic".into(),
    name: decode_html_entities(playlist.name.as_deref().unwrap_or("")),
    cover: normalize_cover(playlist.cover_img_url.as_deref()),
    creator: decode_html_entities(
      playlist
        .creator
        .as_ref()
        .and_then(|c| c.nickname.as_deref())
        .unwrap_or(""),
    ),
    song_count: playlist
      .track_count
      .or_else(|| playlist.track_ids.as_ref().map(|t| t.len() as u32))
      .or_else(|| playlist.tracks.as_ref().map(|t| t.len() as u32))
      .unwrap_or(0),
    platform_playlist_id: Some(id.to_string()),
  }
}

fn all_track_ids(playlist: &NeteasePlaylist) -> Vec<i64> {
  if let Some(ids) = playlist.track_ids.as_ref() {
    if !ids.is_empty() {
      return ids.iter().map(|t| t.id).collect();
    }
  }
  playlist
    .tracks
    .as_ref()
    .map(|tracks| tracks.iter().map(|t| t.id).collect())
    .unwrap_or_default()
}

async fn fetch_playlist_detail(playlist_id: &str) -> Result<NeteasePlaylist, String> {
  if let Ok(mut map) = PLAYLIST_CACHE.lock() {
    prune_playlist_cache(&mut map);
    if let Some(entry) = map.get(playlist_id) {
      if Instant::now() < entry.expires {
        return Ok(entry.playlist.clone());
      }
    }
  }

  let api = format!(
    "https://music.163.com/api/v6/playlist/detail?id={playlist_id}&n={DETAIL_TRACK_N}&s={DETAIL_COLLECTORS_S}"
  );
  let client = http_client()?;
  let mut req = client.get(&api);
  for (k, v) in netease_headers() {
    req = req.header(k, v);
  }
  let res: NeteaseResponse = req
    .send()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?
    .json()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?;

  assert_code(res.code, res.msg.as_deref().or(res.message.as_deref()))?;
  let playlist = res.playlist.ok_or_else(|| "UPSTREAM_ERROR".to_string())?;

  if let Ok(mut map) = PLAYLIST_CACHE.lock() {
    map.insert(
      playlist_id.to_string(),
      PlaylistCacheEntry {
        expires: Instant::now() + PLAYLIST_TTL,
        playlist: playlist.clone(),
      },
    );
    prune_playlist_cache(&mut map);
  }
  Ok(playlist)
}

async fn fetch_playlist_detail_v1(playlist_id: &str) -> Result<NeteasePlaylist, String> {
  let api = format!("https://music.163.com/api/v1/playlist/detail?id={playlist_id}");
  let client = http_client()?;
  let mut req = client.get(&api);
  for (k, v) in netease_headers() {
    req = req.header(k, v);
  }
  let res: NeteaseResponse = req
    .send()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?
    .json()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?;
  assert_code(res.code, res.msg.as_deref().or(res.message.as_deref()))?;
  res.playlist.ok_or_else(|| "UPSTREAM_ERROR".to_string())
}

async fn fetch_tracks_by_ids(ids: &[i64]) -> Result<Vec<SongInfo>, String> {
  if ids.is_empty() {
    return Ok(vec![]);
  }

  let mut by_id: HashMap<i64, SongInfo> = HashMap::with_capacity(ids.len());
  for chunk in ids.chunks(SONG_DETAIL_CHUNK) {
    let ids_json = serde_json::to_string(chunk).unwrap_or_else(|_| "[]".into());
    let client = http_client()?;
    let mut req = client
      .get("https://music.163.com/api/song/detail")
      .query(&[("ids", ids_json)]);
    for (k, v) in netease_headers() {
      req = req.header(k, v);
    }
    let res: SongDetailResponse = req
      .send()
      .await
      .map_err(|_| "UPSTREAM_ERROR".to_string())?
      .json()
      .await
      .map_err(|_| "UPSTREAM_ERROR".to_string())?;
    assert_code(res.code, res.msg.as_deref().or(res.message.as_deref()))?;
    for song in parse_tracks(res.songs.as_deref().unwrap_or(&[])) {
      if let Some(id) = song.platform_numeric_id {
        by_id.insert(id, song);
      }
    }
  }

  // Preserve playlist order; song/detail does not guarantee request order.
  Ok(ids.iter().filter_map(|id| by_id.remove(id)).collect())
}

fn page_result(meta: PlaylistMeta, songs: Vec<SongInfo>, offset: u32, limit: u32) -> PlaylistPage {
  let has_more = offset.saturating_add(limit) < meta.song_count;
  PlaylistPage {
    name: meta.name,
    cover: meta.cover,
    song_count: meta.song_count,
    songs,
    offset,
    limit,
    has_more,
    paginated: true,
    platform_playlist_id: meta.platform_playlist_id,
  }
}

async fn page_from_playlist(
  playlist: &NeteasePlaylist,
  id: &str,
  offset: u32,
  limit: u32,
) -> Result<PlaylistPage, String> {
  let mut meta = meta_from_playlist(playlist, id);
  let track_ids = all_track_ids(playlist);
  if meta.song_count == 0 {
    meta.song_count = track_ids.len() as u32;
  }

  let start = (offset as usize).min(track_ids.len());
  let end = (start + limit as usize).min(track_ids.len());
  let page_ids = &track_ids[start..end];

  if page_ids.is_empty() {
    return Ok(page_result(meta, vec![], offset, limit));
  }

  let embedded_by_id: HashMap<i64, SongInfo> =
    parse_tracks(playlist.tracks.as_deref().unwrap_or(&[]))
      .into_iter()
      .filter_map(|s| s.platform_numeric_id.map(|id| (id, s)))
      .collect();

  // Prefer song/detail for the page window so pagination is never tied to the
  // truncated `tracks` array. Fall back to embedded metadata when detail misses.
  let fetched = fetch_tracks_by_ids(page_ids).await.unwrap_or_default();
  let mut fetched_by_id: HashMap<i64, SongInfo> = fetched
    .into_iter()
    .filter_map(|s| s.platform_numeric_id.map(|id| (id, s)))
    .collect();

  let mut songs = Vec::with_capacity(page_ids.len());
  for &song_id in page_ids {
    if let Some(mut song) = fetched_by_id.remove(&song_id) {
      if song.cover.is_empty() {
        if let Some(fb) = embedded_by_id.get(&song_id) {
          song.cover = fb.cover.clone();
          if song.album.is_empty() {
            song.album = fb.album.clone();
          }
        }
      }
      songs.push(song);
      continue;
    }
    if let Some(song) = embedded_by_id.get(&song_id) {
      songs.push(song.clone());
      continue;
    }
    // Keep slot aligned with trackIds so the client offset stays correct.
    songs.push(SongInfo {
      name: format!("Song {song_id}"),
      artist: "Unknown".into(),
      cover: String::new(),
      album: String::new(),
      platform_song_id: song_id.to_string(),
      platform_numeric_id: Some(song_id),
      platform_song_type: None,
      duration: None,
    });
  }

  Ok(page_result(meta, songs, offset, limit))
}

pub async fn get_meta(url: &str) -> Result<PlaylistMeta, String> {
  let id = resolve_playlist_id(url).await?;
  let playlist = match fetch_playlist_detail(&id).await {
    Ok(p) => p,
    Err(_) => fetch_playlist_detail_v1(&id).await?,
  };
  Ok(meta_from_playlist(&playlist, &id))
}

pub async fn get_page(
  url: &str,
  offset: u32,
  limit: u32,
  platform_playlist_id: Option<&str>,
) -> Result<PlaylistPage, String> {
  let id = match platform_playlist_id {
    Some(id) if !id.is_empty() => id.to_string(),
    _ => resolve_playlist_id(url).await?,
  };
  let safe_limit = limit.max(1);

  let playlist = match fetch_playlist_detail(&id).await {
    Ok(p) => p,
    Err(_) => fetch_playlist_detail_v1(&id).await?,
  };
  let id = playlist.id.map(|i| i.to_string()).unwrap_or(id);
  page_from_playlist(&playlist, &id, offset, safe_limit).await
}
