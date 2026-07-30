use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use once_cell::sync::Lazy;

use crate::types::PlaylistResult;

const DEFAULT_TTL: Duration = Duration::from_secs(5 * 60);
/// Bound in-memory playlist payloads (each entry can hold hundreds of songs).
const MAX_ENTRIES: usize = 6;

struct Entry {
  expires: Instant,
  result: PlaylistResult,
}

static CACHE: Lazy<Mutex<HashMap<String, Entry>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub fn cache_key(platform: &str, url: &str) -> String {
  format!("{}:{}", platform, url.trim())
}

fn prune(map: &mut HashMap<String, Entry>) {
  let now = Instant::now();
  map.retain(|_, entry| now < entry.expires);
  while map.len() > MAX_ENTRIES {
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

pub fn get(key: &str) -> Option<PlaylistResult> {
  let mut map = CACHE.lock().ok()?;
  prune(&mut map);
  let now = Instant::now();
  if let Some(entry) = map.get(key) {
    if now < entry.expires {
      return Some(entry.result.clone());
    }
  }
  map.remove(key);
  None
}

pub fn set(key: String, result: PlaylistResult) {
  if let Ok(mut map) = CACHE.lock() {
    map.insert(
      key,
      Entry {
        expires: Instant::now() + DEFAULT_TTL,
        result,
      },
    );
    prune(&mut map);
  }
}

pub fn invalidate(platform: &str, url: &str) {
  if let Ok(mut map) = CACHE.lock() {
    map.remove(&cache_key(platform, url));
  }
}
