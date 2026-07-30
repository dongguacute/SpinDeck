use axum::{
  body::Body,
  extract::Query,
  http::{header, HeaderMap, HeaderValue, StatusCode},
  response::Response,
};
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::Semaphore;

use crate::util::http_client_follow;

/// Reject oversized cover art to keep proxy / WebView memory bounded.
const MAX_IMAGE_BYTES: u64 = 1_500_000;
/// Limit concurrent full-image buffers from the shelf cover storm.
const IMAGE_CONCURRENCY: usize = 6;

static IMAGE_SEM: Lazy<Arc<Semaphore>> = Lazy::new(|| Arc::new(Semaphore::new(IMAGE_CONCURRENCY)));

#[derive(Debug, Deserialize)]
pub struct ImageQuery {
  url: Option<String>,
}

pub async fn proxy_image(Query(query): Query<ImageQuery>) -> Response {
  let Some(target) = query.url.filter(|u| !u.is_empty()) else {
    return Response::builder()
      .status(StatusCode::BAD_REQUEST)
      .body(Body::from("missing url param"))
      .unwrap();
  };

  let Ok(_permit) = IMAGE_SEM.acquire().await else {
    return Response::builder()
      .status(StatusCode::SERVICE_UNAVAILABLE)
      .body(Body::from("busy"))
      .unwrap();
  };

  let mut referer = "https://y.qq.com/";
  if let Ok(parsed) = url::Url::parse(&target) {
    let host = parsed.host_str().unwrap_or("");
    if host.contains("126.net") || host.contains("163.com") {
      referer = "https://music.163.com/";
    }
  }

  let Ok(client) = http_client_follow() else {
    return Response::builder()
      .status(StatusCode::BAD_GATEWAY)
      .body(Body::from("fetch failed"))
      .unwrap();
  };

  let resp = match client
    .get(&target)
    .header("Referer", referer)
    .header(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    )
    .send()
    .await
  {
    Ok(r) => r,
    Err(_) => {
      return Response::builder()
        .status(StatusCode::BAD_GATEWAY)
        .body(Body::from("fetch failed"))
        .unwrap();
    }
  };

  if !resp.status().is_success() {
    return Response::builder()
      .status(StatusCode::BAD_GATEWAY)
      .body(Body::from("upstream error"))
      .unwrap();
  }

  if let Some(len) = resp.content_length() {
    if len > MAX_IMAGE_BYTES {
      return Response::builder()
        .status(StatusCode::PAYLOAD_TOO_LARGE)
        .body(Body::from("image too large"))
        .unwrap();
    }
  }

  let content_type = resp
    .headers()
    .get(header::CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .unwrap_or("image/jpeg")
    .to_string();

  let bytes = match resp.bytes().await {
    Ok(b) => b,
    Err(_) => {
      return Response::builder()
        .status(StatusCode::BAD_GATEWAY)
        .body(Body::from("fetch failed"))
        .unwrap();
    }
  };

  if bytes.len() as u64 > MAX_IMAGE_BYTES {
    return Response::builder()
      .status(StatusCode::PAYLOAD_TOO_LARGE)
      .body(Body::from("image too large"))
      .unwrap();
  }

  let mut headers = HeaderMap::new();
  headers.insert(
    header::CONTENT_TYPE,
    HeaderValue::from_str(&content_type).unwrap_or(HeaderValue::from_static("image/jpeg")),
  );
  headers.insert(
    header::ACCESS_CONTROL_ALLOW_ORIGIN,
    HeaderValue::from_static("*"),
  );
  headers.insert(
    header::CACHE_CONTROL,
    HeaderValue::from_static("public, max-age=86400"),
  );

  Response::builder()
    .status(StatusCode::OK)
    .body(Body::from(bytes))
    .map(|mut r| {
      *r.headers_mut() = headers;
      r
    })
    .unwrap_or_else(|_| {
      Response::builder()
        .status(StatusCode::INTERNAL_SERVER_ERROR)
        .body(Body::empty())
        .unwrap()
    })
}
