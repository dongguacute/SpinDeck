//! Cover-art proxy via a Tauri custom URI scheme (`cover://`).

use once_cell::sync::Lazy;
use std::sync::Arc;
use tauri::http::{header, HeaderValue, Request, Response, StatusCode};
use tauri::Runtime;
use tokio::sync::Semaphore;

use crate::util::http_client_follow;

/// Reject oversized cover art to keep proxy / WebView memory bounded.
const MAX_IMAGE_BYTES: u64 = 1_500_000;
/// Limit concurrent full-image buffers from the shelf cover storm.
const IMAGE_CONCURRENCY: usize = 6;

static IMAGE_SEM: Lazy<Arc<Semaphore>> = Lazy::new(|| Arc::new(Semaphore::new(IMAGE_CONCURRENCY)));

pub const COVER_SCHEME: &str = "cover";

fn error_response(status: StatusCode, body: &'static str) -> Response<Vec<u8>> {
  Response::builder()
    .status(status)
    .header(header::CONTENT_TYPE, "text/plain")
    .body(body.as_bytes().to_vec())
    .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn parse_target_url(request: &Request<Vec<u8>>) -> Option<String> {
  let uri = request.uri();
  // cover://localhost/?url=...  or  http://cover.localhost/?url=...
  let query = uri.query()?;
  for pair in query.split('&') {
    let mut parts = pair.splitn(2, '=');
    let key = parts.next()?;
    let value = parts.next().unwrap_or("");
    if key == "url" {
      let decoded = urlencoding_decode(value);
      if !decoded.is_empty() {
        return Some(decoded);
      }
    }
  }
  None
}

fn urlencoding_decode(input: &str) -> String {
  let mut out = Vec::with_capacity(input.len());
  let bytes = input.as_bytes();
  let mut i = 0;
  while i < bytes.len() {
    match bytes[i] {
      b'+' => {
        out.push(b' ');
        i += 1;
      }
      b'%' if i + 2 < bytes.len() => {
        let hex = &input[i + 1..i + 3];
        if let Ok(v) = u8::from_str_radix(hex, 16) {
          out.push(v);
          i += 3;
        } else {
          out.push(bytes[i]);
          i += 1;
        }
      }
      b => {
        out.push(b);
        i += 1;
      }
    }
  }
  String::from_utf8_lossy(&out).into_owned()
}

async fn fetch_cover_bytes(target: &str) -> Result<(String, Vec<u8>), StatusCode> {
  let Ok(_permit) = IMAGE_SEM.acquire().await else {
    return Err(StatusCode::SERVICE_UNAVAILABLE);
  };

  let mut referer = "https://y.qq.com/";
  if let Ok(parsed) = url::Url::parse(target) {
    let host = parsed.host_str().unwrap_or("");
    if host.contains("126.net") || host.contains("163.com") {
      referer = "https://music.163.com/";
    }
  }

  let Ok(client) = http_client_follow() else {
    return Err(StatusCode::BAD_GATEWAY);
  };

  let resp = client
    .get(target)
    .header("Referer", referer)
    .header(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    )
    .send()
    .await
    .map_err(|_| StatusCode::BAD_GATEWAY)?;

  if !resp.status().is_success() {
    return Err(StatusCode::BAD_GATEWAY);
  }

  if let Some(len) = resp.content_length() {
    if len > MAX_IMAGE_BYTES {
      return Err(StatusCode::PAYLOAD_TOO_LARGE);
    }
  }

  let content_type = resp
    .headers()
    .get(header::CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .unwrap_or("image/jpeg")
    .to_string();

  let bytes = resp
    .bytes()
    .await
    .map_err(|_| StatusCode::BAD_GATEWAY)?
    .to_vec();

  if bytes.len() as u64 > MAX_IMAGE_BYTES {
    return Err(StatusCode::PAYLOAD_TOO_LARGE);
  }

  Ok((content_type, bytes))
}

pub async fn handle_cover_request(request: Request<Vec<u8>>) -> Response<Vec<u8>> {
  let Some(target) = parse_target_url(&request) else {
    log::warn!("cover:// request missing url param");
    return error_response(StatusCode::BAD_REQUEST, "missing url param");
  };

  match fetch_cover_bytes(&target).await {
    Ok((content_type, bytes)) => Response::builder()
      .status(StatusCode::OK)
      .header(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&content_type).unwrap_or(HeaderValue::from_static("image/jpeg")),
      )
      .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
      .header(header::CACHE_CONTROL, "public, max-age=86400")
      .body(bytes)
      .unwrap_or_else(|_| {
        log::error!("cover:// response build failed");
        error_response(StatusCode::INTERNAL_SERVER_ERROR, "build failed")
      }),
    Err(StatusCode::PAYLOAD_TOO_LARGE) => {
      log::warn!("cover:// image too large");
      error_response(StatusCode::PAYLOAD_TOO_LARGE, "image too large")
    }
    Err(StatusCode::SERVICE_UNAVAILABLE) => {
      log::warn!("cover:// busy (concurrency limit)");
      error_response(StatusCode::SERVICE_UNAVAILABLE, "busy")
    }
    Err(status) => {
      log::warn!("cover:// fetch failed status={status}");
      error_response(StatusCode::BAD_GATEWAY, "fetch failed")
    }
  }
}

/// Register the `cover` URI scheme used by `<img>` / canvas cover loading.
pub fn register_protocol<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
  builder.register_asynchronous_uri_scheme_protocol(COVER_SCHEME, |_ctx, request, responder| {
    tauri::async_runtime::spawn(async move {
      let response = handle_cover_request(request).await;
      responder.respond(response);
    });
  })
}
