use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use once_cell::sync::Lazy;

use super::cache;
use super::http_client;
use crate::types::{PlaylistMeta, PlaylistResult, SongInfo};
use crate::util::decode_html_entities;

#[derive(Debug, Deserialize)]
struct QQMusicResponse {
  cdlist: Option<Vec<QQMusicCd>>,
}

#[derive(Debug, Clone, Deserialize)]
struct QQMusicCd {
  dissname: Option<String>,
  logo: Option<String>,
  diss_cover: Option<String>,
  nickname: Option<String>,
  nick: Option<String>,
  songlist: Option<Vec<QQMusicSong>>,
}

#[derive(Debug, Clone, Deserialize)]
struct QQMusicSong {
  songmid: Option<String>,
  media_mid: Option<String>,
  songname: Option<String>,
  songorig: Option<String>,
  title: Option<String>,
  albummid: Option<String>,
  albumname: Option<String>,
  album_name: Option<String>,
  singer: Option<Vec<QQMusicSinger>>,
  songid: Option<serde_json::Value>,
  songtype: Option<i64>,
  interval: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
struct QQMusicSinger {
  name: Option<String>,
}

struct RawEntry {
  expires: Instant,
  cd: QQMusicCd,
}

static RAW_CACHE: Lazy<Mutex<HashMap<String, RawEntry>>> = Lazy::new(|| Mutex::new(HashMap::new()));

const RAW_TTL: Duration = Duration::from_secs(5 * 60);
const RAW_MAX_ENTRIES: usize = 6;

fn prune_raw_cache(map: &mut HashMap<String, RawEntry>) {
  let now = Instant::now();
  map.retain(|_, entry| now < entry.expires);
  while map.len() > RAW_MAX_ENTRIES {
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

async fn resolve_disstid(url: &str) -> Result<String, String> {
  let client = http_client()?;
  let resolved = if url.contains("c6.y.qq.com") || url.contains("c.y.qq.com") {
    let res = client
      .get(url)
      .send()
      .await
      .map_err(|_| "REDIRECT_FAILED".to_string())?;
    let location = res
      .headers()
      .get("location")
      .and_then(|v| v.to_str().ok())
      .unwrap_or("")
      .to_string();
    if location.is_empty() {
      return Err("REDIRECT_FAILED".into());
    }
    location
  } else {
    url.to_string()
  };

  let parsed = url::Url::parse(&resolved).map_err(|_| "PARSE_ID_FAILED".to_string())?;
  let id = parsed
    .query_pairs()
    .find(|(k, _)| k == "id")
    .map(|(_, v)| v.to_string())
    .or_else(|| {
      resolved
        .split('=')
        .nth(1)
        .map(|s| s.split('&').next().unwrap_or(s).to_string())
    })
    .filter(|s| !s.is_empty())
    .ok_or_else(|| "PARSE_ID_FAILED".to_string())?;
  Ok(id)
}

async fn fetch_raw(url: &str, force_refresh: bool) -> Result<QQMusicCd, String> {
  let key = cache::cache_key("QQMusic", url);
  if force_refresh {
    if let Ok(mut map) = RAW_CACHE.lock() {
      map.remove(&key);
    }
  } else if let Ok(mut map) = RAW_CACHE.lock() {
    prune_raw_cache(&mut map);
    if let Some(entry) = map.get(&key) {
      if Instant::now() < entry.expires {
        return Ok(entry.cd.clone());
      }
    }
  }

  let disstid = resolve_disstid(url).await?;
  let api = format!(
    "https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?disstid={disstid}&type=1&json=1&utf8=1&onlysong=0&format=json&g_tk=5381&loginUin=0&hostUin=0&platform=yqq&needNewCode=0"
  );
  let client = http_client()?;
  let res: QQMusicResponse = client
    .get(&api)
    .header("Referer", "https://y.qq.com/")
    .send()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?
    .json()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?;

  let cd = res
    .cdlist
    .and_then(|mut list| list.drain(..).next())
    .unwrap_or(QQMusicCd {
      dissname: None,
      logo: None,
      diss_cover: None,
      nickname: None,
      nick: None,
      songlist: None,
    });

  if let Ok(mut map) = RAW_CACHE.lock() {
    map.insert(
      key,
      RawEntry {
        expires: Instant::now() + RAW_TTL,
        cd: cd.clone(),
      },
    );
    prune_raw_cache(&mut map);
  }
  Ok(cd)
}

fn parse_songid(v: &Option<serde_json::Value>) -> Option<i64> {
  match v {
    Some(serde_json::Value::Number(n)) => n.as_i64(),
    Some(serde_json::Value::String(s)) if !s.is_empty() => s.parse().ok(),
    _ => None,
  }
}

fn parse_songs(songlist: &[QQMusicSong]) -> Vec<SongInfo> {
  songlist
    .iter()
    .map(|item| {
      let albummid = item.albummid.clone().unwrap_or_default();
      let singers: Vec<String> = item
        .singer
        .as_ref()
        .map(|s| {
          s.iter()
            .filter_map(|x| x.name.as_ref())
            .map(|n| decode_html_entities(n))
            .filter(|n| !n.is_empty())
            .collect()
        })
        .unwrap_or_default();
      let artist = if singers.is_empty() {
        "Unknown".to_string()
      } else {
        singers.join(" / ")
      };
      SongInfo {
        name: decode_html_entities(
          item
            .songname
            .as_deref()
            .or(item.songorig.as_deref())
            .or(item.title.as_deref())
            .unwrap_or(""),
        ),
        cover: if albummid.is_empty() {
          String::new()
        } else {
          format!("https://y.gtimg.cn/music/photo_new/T002R300x300M000{albummid}.jpg")
        },
        artist,
        album: decode_html_entities(
          item
            .albumname
            .as_deref()
            .or(item.album_name.as_deref())
            .unwrap_or(""),
        ),
        platform_song_id: item
          .songmid
          .clone()
          .or_else(|| item.media_mid.clone())
          .unwrap_or_default(),
        platform_numeric_id: parse_songid(&item.songid),
        platform_song_type: Some(item.songtype.unwrap_or(0)),
        duration: item.interval,
      }
    })
    .collect()
}

fn meta_from_cd(cd: &QQMusicCd) -> PlaylistMeta {
  let songs = cd.songlist.as_deref().unwrap_or(&[]);
  PlaylistMeta {
    platform: "QQMusic".into(),
    name: decode_html_entities(cd.dissname.as_deref().unwrap_or("")),
    cover: cd
      .logo
      .clone()
      .or_else(|| cd.diss_cover.clone())
      .unwrap_or_default(),
    creator: decode_html_entities(cd.nickname.as_deref().or(cd.nick.as_deref()).unwrap_or("")),
    song_count: songs.len() as u32,
    platform_playlist_id: None,
  }
}

pub async fn get_meta(url: &str) -> Result<PlaylistMeta, String> {
  let cd = fetch_raw(url, false).await?;
  Ok(meta_from_cd(&cd))
}

pub async fn get_songs(url: &str, force_refresh: bool) -> Result<PlaylistResult, String> {
  let key = cache::cache_key("QQMusic", url);
  if force_refresh {
    cache::invalidate("QQMusic", url);
  } else if let Some(cached) = cache::get(&key) {
    return Ok(cached);
  }

  let cd = fetch_raw(url, force_refresh).await?;
  let meta = meta_from_cd(&cd);
  let songs: Vec<_> = parse_songs(cd.songlist.as_deref().unwrap_or(&[]))
    .into_iter()
    .take(super::FULL_LOAD_MAX)
    .collect();
  let result = PlaylistResult {
    platform: meta.platform,
    name: meta.name,
    cover: meta.cover,
    creator: meta.creator,
    songs,
  };
  cache::set(key, result.clone());
  Ok(result)
}
