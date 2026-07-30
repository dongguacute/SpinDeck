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

struct PageCacheEntry {
  expires: Instant,
  playlist: NeteasePlaylist,
}

static V6_CACHE: Lazy<Mutex<HashMap<String, PageCacheEntry>>> =
  Lazy::new(|| Mutex::new(HashMap::new()));

const V6_TTL: Duration = Duration::from_secs(60);
/// Pagination reuses a few offset/limit keys; keep this small — each entry holds track metadata.
const V6_MAX_ENTRIES: usize = 8;

fn prune_v6_cache(map: &mut HashMap<String, PageCacheEntry>) {
  let now = Instant::now();
  map.retain(|_, entry| now < entry.expires);
  while map.len() > V6_MAX_ENTRIES {
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

async fn fetch_v6_raw(
  playlist_id: &str,
  offset: u32,
  limit: u32,
) -> Result<NeteasePlaylist, String> {
  let cache_key = format!("{playlist_id}:{offset}:{limit}");
  if let Ok(mut map) = V6_CACHE.lock() {
    prune_v6_cache(&mut map);
    if let Some(entry) = map.get(&cache_key) {
      if Instant::now() < entry.expires {
        return Ok(entry.playlist.clone());
      }
    }
  }

  let api =
    format!("https://music.163.com/api/v6/playlist/detail?id={playlist_id}&n={limit}&s={offset}");
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

  if let Ok(mut map) = V6_CACHE.lock() {
    map.insert(
      cache_key,
      PageCacheEntry {
        expires: Instant::now() + V6_TTL,
        playlist: playlist.clone(),
      },
    );
    prune_v6_cache(&mut map);
  }
  Ok(playlist)
}

async fn fetch_tracks_by_ids(ids: &[i64]) -> Result<Vec<SongInfo>, String> {
  if ids.is_empty() {
    return Ok(vec![]);
  }
  let ids_json = serde_json::to_string(ids).unwrap_or_else(|_| "[]".into());
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
  Ok(parse_tracks(res.songs.as_deref().unwrap_or(&[])))
}

fn should_fallback(playlist: &NeteasePlaylist, songs: &[SongInfo], limit: u32) -> bool {
  let expected = playlist
    .track_count
    .or_else(|| playlist.track_ids.as_ref().map(|t| t.len() as u32))
    .unwrap_or(0);
  if songs.len() as u32 >= limit {
    return false;
  }
  if expected > 0 && songs.is_empty() {
    return true;
  }
  expected > 0 && (songs.len() as u32) < limit.min(expected)
}

async fn page_from_playlist(
  playlist: &NeteasePlaylist,
  id: &str,
  offset: u32,
  limit: u32,
) -> Result<PlaylistPage, String> {
  let meta = meta_from_playlist(playlist, id);
  let page_ids: Vec<i64> = playlist
    .track_ids
    .as_ref()
    .map(|ids| {
      ids
        .iter()
        .skip(offset as usize)
        .take(limit as usize)
        .map(|t| t.id)
        .collect()
    })
    .unwrap_or_default();

  let v6_songs = parse_tracks(playlist.tracks.as_deref().unwrap_or(&[]));
  let v6_by_id: HashMap<String, SongInfo> = v6_songs
    .iter()
    .cloned()
    .map(|s| (s.platform_song_id.clone(), s))
    .collect();
  let covers_complete = !v6_songs.is_empty() && v6_songs.iter().all(|s| !s.cover.is_empty());
  let needed = page_ids.len().max(1).min(limit as usize);

  if v6_songs.len() >= needed && covers_complete {
    let songs: Vec<_> = v6_songs.into_iter().take(limit as usize).collect();
    return Ok(page_result(meta, songs, offset, limit));
  }

  if !page_ids.is_empty() {
    if let Ok(detail) = fetch_tracks_by_ids(&page_ids).await {
      if !detail.is_empty() {
        let songs = detail
          .into_iter()
          .map(|mut song| {
            if song.cover.is_empty() {
              if let Some(fb) = v6_by_id.get(&song.platform_song_id) {
                song.cover = fb.cover.clone();
                if song.album.is_empty() {
                  song.album = fb.album.clone();
                }
              }
            }
            song
          })
          .collect();
        return Ok(page_result(meta, songs, offset, limit));
      }
    }
  }

  let songs: Vec<_> = v6_songs.into_iter().take(limit as usize).collect();
  Ok(page_result(meta, songs, offset, limit))
}

fn page_result(meta: PlaylistMeta, songs: Vec<SongInfo>, offset: u32, limit: u32) -> PlaylistPage {
  let has_more = offset + (songs.len() as u32) < meta.song_count;
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

async fn fallback_v1(url: &str, offset: u32, limit: u32) -> Result<PlaylistPage, String> {
  let id = resolve_playlist_id(url).await?;
  let api = format!("https://music.163.com/api/v1/playlist/detail?id={id}");
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
  let id = playlist.id.map(|i| i.to_string()).unwrap_or(id);
  page_from_playlist(&playlist, &id, offset, limit).await
}

pub async fn get_meta(url: &str) -> Result<PlaylistMeta, String> {
  let id = resolve_playlist_id(url).await?;
  let playlist = fetch_v6_raw(&id, 0, 1).await?;
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

  match fetch_v6_raw(&id, offset, safe_limit).await {
    Ok(playlist) => {
      let songs = parse_tracks(playlist.tracks.as_deref().unwrap_or(&[]));
      if !should_fallback(&playlist, &songs, safe_limit) {
        return Ok(page_result(
          meta_from_playlist(&playlist, &id),
          songs,
          offset,
          safe_limit,
        ));
      }
      page_from_playlist(&playlist, &id, offset, safe_limit).await
    }
    Err(_) => fallback_v1(url, offset, safe_limit).await,
  }
}
