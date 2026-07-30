use serde::Deserialize;

use super::cache;
use super::http_client_follow;
use crate::types::{PlaylistMeta, PlaylistResult, SongInfo};
use crate::util::decode_html_entities;

#[derive(Debug, Deserialize)]
struct KugouSong {
  filename: Option<String>,
  name: Option<String>,
  hash: Option<String>,
  audio_id: Option<serde_json::Value>,
  #[allow(dead_code)]
  album_id: Option<String>,
  album_name: Option<String>,
  duration: Option<i64>,
  timelen: Option<i64>,
  imgurl: Option<String>,
  album_img: Option<String>,
  pic: Option<String>,
  cover: Option<String>,
  trans_param: Option<KugouTransParam>,
}

#[derive(Debug, Deserialize)]
struct KugouTransParam {
  union_cover: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChainResponse {
  status: i64,
  list: Option<ChainList>,
  info: Option<Vec<ChainInfo>>,
}

#[derive(Debug, Deserialize)]
struct ChainList {
  info: Option<Vec<KugouSong>>,
}

#[derive(Debug, Deserialize)]
struct ChainInfo {
  name: Option<String>,
  pic: Option<String>,
  list_create_username: Option<String>,
  #[allow(dead_code)]
  listid: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct ZlistResponse {
  status: i64,
  list: Option<ZlistInner>,
}

#[derive(Debug, Deserialize)]
struct ZlistInner {
  info: Option<Vec<KugouSong>>,
  list_name: Option<String>,
  imgurl: Option<String>,
  nickname: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SpecialInfoResponse {
  status: serde_json::Value,
  data: Option<SpecialInfo>,
}

#[derive(Debug, Deserialize)]
struct SpecialInfo {
  specialname: Option<String>,
  imgurl: Option<String>,
  nickname: Option<String>,
  #[allow(dead_code)]
  specialid: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct SpecialSongsResponse {
  status: serde_json::Value,
  data: Option<SpecialSongsData>,
}

#[derive(Debug, Deserialize)]
struct SpecialSongsData {
  info: Option<Vec<KugouSong>>,
}

const MOBILE_UA: &str = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";

fn format_image(url: Option<&str>) -> String {
  let Some(url) = url.filter(|s| !s.is_empty()) else {
    return String::new();
  };
  let formatted = if url.contains("stdmusic") {
    url.replace("{size}/", "").replace("{size}", "")
  } else {
    url.replace("{size}", "400")
  };
  formatted.replacen("http://", "https://", 1)
}

fn parse_audio_id(v: &Option<serde_json::Value>) -> Option<i64> {
  match v {
    Some(serde_json::Value::Number(n)) => n.as_i64(),
    Some(serde_json::Value::String(s)) => s.parse().ok(),
    _ => None,
  }
}

fn parse_songs(songs: &[KugouSong], playlist_cover: &str) -> Vec<SongInfo> {
  songs
    .iter()
    .map(|item| {
      let raw_name = item
        .filename
        .as_deref()
        .or(item.name.as_deref())
        .unwrap_or("Unknown");
      let (artist, name) = if let Some((a, n)) = raw_name.split_once(" - ") {
        (a.trim().to_string(), n.trim().to_string())
      } else {
        ("Unknown".into(), raw_name.to_string())
      };
      let cover = format_image(
        item
          .album_img
          .as_deref()
          .or(item.pic.as_deref())
          .or(item.cover.as_deref())
          .or(
            item
              .trans_param
              .as_ref()
              .and_then(|t| t.union_cover.as_deref()),
          )
          .or(item.imgurl.as_deref()),
      );
      let cover = if cover.is_empty() {
        playlist_cover.to_string()
      } else {
        cover
      };
      SongInfo {
        name: decode_html_entities(&name),
        cover,
        artist: decode_html_entities(&artist),
        album: decode_html_entities(item.album_name.as_deref().unwrap_or("")),
        platform_song_id: item.hash.clone().unwrap_or_default(),
        platform_numeric_id: parse_audio_id(&item.audio_id),
        platform_song_type: None,
        duration: item.duration.or_else(|| item.timelen.map(|t| t / 1000)),
      }
    })
    .collect()
}

async fn try_chain(url: &str) -> Result<Option<PlaylistResult>, String> {
  let chain_re =
    regex::Regex::new(r"(?:chain=([a-zA-Z0-9]+)|t\d*\.kugou\.com/([a-zA-Z0-9]+))").unwrap();
  let Some(caps) = chain_re.captures(url) else {
    return Ok(None);
  };
  let chain = caps
    .get(1)
    .or_else(|| caps.get(2))
    .map(|m| m.as_str())
    .unwrap_or("");
  if chain.is_empty() {
    return Ok(None);
  }

  let client = http_client_follow()?;
  let chain_url = format!("https://m.kugou.com/zlist/list?chain={chain}&json=true&pagesize=500");
  let res: ChainResponse = client
    .get(&chain_url)
    .header("User-Agent", MOBILE_UA)
    .send()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?
    .json()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?;

  if res.status != 1 {
    return Ok(None);
  }
  let songs = res.list.and_then(|l| l.info).unwrap_or_default();
  if songs.is_empty() {
    return Ok(None);
  }
  let info = res.info.and_then(|mut i| i.drain(..).next());
  let cover = format_image(info.as_ref().and_then(|i| i.pic.as_deref()));
  let name = info
    .as_ref()
    .and_then(|i| i.name.clone())
    .unwrap_or_else(|| "Kugou Playlist".into());
  let creator = info
    .as_ref()
    .and_then(|i| i.list_create_username.clone())
    .unwrap_or_default();
  Ok(Some(PlaylistResult {
    platform: "KugouMusic".into(),
    name: decode_html_entities(&name),
    cover: cover.clone(),
    creator: decode_html_entities(&creator),
    songs: parse_songs(&songs, &cover),
  }))
}

async fn try_zlist(url: &str) -> Result<Option<PlaylistResult>, String> {
  let is_share = (url.contains("listid=") && url.contains("sign="))
    || url.contains("share/index.html")
    || url.contains("share/zlist.html");
  if !is_share {
    return Ok(None);
  }

  let full = if url.starts_with("http") {
    url.to_string()
  } else {
    format!(
      "https://m3ws.kugou.com/share/{}",
      url.trim_start_matches('/')
    )
  };
  let parsed = url::Url::parse(&full).map_err(|_| "PARSE_ID_FAILED".to_string())?;
  let listid = parsed
    .query_pairs()
    .find(|(k, _)| k == "listid")
    .map(|(_, v)| v.to_string());
  let uid = parsed
    .query_pairs()
    .find(|(k, _)| k == "uid")
    .map(|(_, v)| v.to_string());
  let sign = parsed
    .query_pairs()
    .find(|(k, _)| k == "sign")
    .map(|(_, v)| v.to_string());
  let t = parsed
    .query_pairs()
    .find(|(k, _)| k == "_t")
    .map(|(_, v)| v.to_string());
  let token = parsed
    .query_pairs()
    .find(|(k, _)| k == "token")
    .map(|(_, v)| v.to_string())
    .unwrap_or_default();
  let typ = parsed
    .query_pairs()
    .find(|(k, _)| k == "type")
    .map(|(_, v)| v.to_string())
    .unwrap_or_else(|| "0".into());

  let (Some(listid), Some(uid), Some(sign), Some(t)) = (listid, uid, sign, t) else {
    return Ok(None);
  };

  let client = http_client_follow()?;
  let zlist_url = format!(
    "http://m3ws.kugou.com/zlist/list?listid={listid}&type={typ}&uid={uid}&sign={sign}&_t={t}&pagesize=500&json=true&token={token}"
  );

  async fn fetch_zlist(
    client: &reqwest::Client,
    zlist_url: &str,
    referer: &str,
  ) -> Result<Option<ZlistResponse>, String> {
    let res = client
      .get(zlist_url)
      .header("User-Agent", MOBILE_UA)
      .header("Referer", referer)
      .send()
      .await
      .map_err(|_| "UPSTREAM_ERROR".to_string())?
      .json::<ZlistResponse>()
      .await
      .ok();
    Ok(res)
  }

  let mut zlist = fetch_zlist(&client, &zlist_url, &full).await?;
  if zlist.as_ref().map(|z| z.status) != Some(1) {
    let alt = zlist_url.replace("m3ws.kugou.com", "m.kugou.com");
    zlist = fetch_zlist(&client, &alt, &full).await?;
  }

  let Some(zlist) = zlist.filter(|z| z.status == 1) else {
    return Err("PLAYLIST_FETCH_FAILED".into());
  };
  let inner = zlist
    .list
    .ok_or_else(|| "PLAYLIST_FETCH_FAILED".to_string())?;
  let songs = inner.info.unwrap_or_default();
  let cover = format_image(inner.imgurl.as_deref());
  Ok(Some(PlaylistResult {
    platform: "KugouMusic".into(),
    name: decode_html_entities(inner.list_name.as_deref().unwrap_or("Kugou Playlist")),
    cover: cover.clone(),
    creator: decode_html_entities(inner.nickname.as_deref().unwrap_or("")),
    songs: parse_songs(&songs, &cover),
  }))
}

async fn resolve_specialid(url: &str) -> Result<String, String> {
  let mut working = url.to_string();
  if working.contains("kugou.com/share/")
    || regex::Regex::new(r"t\d*\.kugou\.com")
      .unwrap()
      .is_match(&working)
  {
    let client = http_client_follow()?;
    if let Ok(res) = client
      .get(&working)
      .header("User-Agent", MOBILE_UA)
      .send()
      .await
    {
      working = res.url().to_string();
    }
  }

  let re = regex::Regex::new(r"(?:special/single/(\d+)|listid=(\d+)|specialid=(\d+))").unwrap();
  if let Some(caps) = re.captures(&working) {
    for i in 1..=3 {
      if let Some(m) = caps.get(i) {
        return Ok(m.as_str().to_string());
      }
    }
  }

  if regex::Regex::new(r"^\d+$")
    .unwrap()
    .is_match(working.trim())
  {
    return Ok(working.trim().to_string());
  }

  if let Ok(parsed) = url::Url::parse(&working.replace("/#/", "/")) {
    for key in ["specialid", "id", "listid"] {
      if let Some((_, v)) = parsed.query_pairs().find(|(k, _)| k == key) {
        if !v.is_empty() {
          return Ok(v.to_string());
        }
      }
    }
  }

  let long = regex::Regex::new(r"/(\d{5,})(?:\.html)?$").unwrap();
  if let Some(caps) = long.captures(&working) {
    return Ok(caps[1].to_string());
  }

  Err("PARSE_ID_FAILED".into())
}

async fn fetch_by_specialid(specialid: &str) -> Result<PlaylistResult, String> {
  let client = http_client_follow()?;
  let info_url = format!(
    "http://mobilecdn.kugou.com/api/v3/special/info?specialid={specialid}&plat=0&version=8352"
  );
  let info_res: SpecialInfoResponse = client
    .get(&info_url)
    .header("User-Agent", MOBILE_UA)
    .send()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?
    .json()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?;

  let status = info_res
    .status
    .as_i64()
    .or_else(|| info_res.status.as_str().and_then(|s| s.parse().ok()))
    .unwrap_or(0);

  let info = if status == 1 { info_res.data } else { None };

  let songs_url = format!(
    "http://mobilecdn.kugou.com/api/v3/special/song?specialid={specialid}&page=1&pagesize=-1&plat=2&version=8989&with_res_tag=1"
  );
  let songs_res: SpecialSongsResponse = client
    .get(&songs_url)
    .header("User-Agent", MOBILE_UA)
    .header("Cookie", "kg_mid=1")
    .send()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?
    .json()
    .await
    .map_err(|_| "UPSTREAM_ERROR".to_string())?;

  let songs_status = songs_res
    .status
    .as_i64()
    .or_else(|| songs_res.status.as_str().and_then(|s| s.parse().ok()))
    .unwrap_or(0);
  if songs_status != 1 {
    return Err("UPSTREAM_ERROR".into());
  }
  let songs = songs_res.data.and_then(|d| d.info).unwrap_or_default();

  let cover = format_image(info.as_ref().and_then(|i| i.imgurl.as_deref()));
  let name = info
    .as_ref()
    .and_then(|i| i.specialname.clone())
    .unwrap_or_else(|| "Kugou Playlist".into());
  let creator = info
    .as_ref()
    .and_then(|i| i.nickname.clone())
    .unwrap_or_default();

  Ok(PlaylistResult {
    platform: "KugouMusic".into(),
    name: decode_html_entities(&name),
    cover: cover.clone(),
    creator: decode_html_entities(&creator),
    songs: parse_songs(&songs, &cover),
  })
}

async fn fetch_list(url: &str) -> Result<PlaylistResult, String> {
  if let Some(result) = try_chain(url).await? {
    return Ok(result);
  }
  if let Some(result) = try_zlist(url).await? {
    return Ok(result);
  }
  let specialid = resolve_specialid(url).await?;
  fetch_by_specialid(&specialid).await
}

pub async fn get_meta(url: &str) -> Result<PlaylistMeta, String> {
  let result = get_songs(url, false).await?;
  Ok(PlaylistMeta {
    platform: result.platform,
    name: result.name,
    cover: result.cover,
    creator: result.creator,
    song_count: result.songs.len() as u32,
    platform_playlist_id: None,
  })
}

pub async fn get_songs(url: &str, force_refresh: bool) -> Result<PlaylistResult, String> {
  let key = cache::cache_key("KugouMusic", url);
  if force_refresh {
    cache::invalidate("KugouMusic", url);
  } else if let Some(cached) = cache::get(&key) {
    return Ok(cached);
  }
  let result = fetch_list(url).await?;
  let result = PlaylistResult {
    platform: result.platform,
    name: result.name,
    cover: result.cover,
    creator: result.creator,
    songs: result
      .songs
      .into_iter()
      .take(super::FULL_LOAD_MAX)
      .collect(),
  };
  cache::set(key, result.clone());
  Ok(result)
}
