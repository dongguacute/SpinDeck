//! Resolve and serve the SPA static assets next to `/api/*`.

use std::path::PathBuf;

use axum::Router;
use tauri::Manager;
use tower_http::services::{ServeDir, ServeFile};

use crate::api;

pub fn resolve_web_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
  if let Ok(resource_dir) = app.path().resource_dir() {
    let bundled = resource_dir.join("web");
    if bundled.join("index.html").exists() {
      return Some(bundled);
    }
  }

  // Dev / local fallback: monorepo apps/web/build/client relative to cwd
  let candidates = [
    PathBuf::from("../web/build/client"),
    PathBuf::from("../../web/build/client"),
    PathBuf::from("apps/web/build/client"),
  ];
  candidates
    .into_iter()
    .find(|path| path.join("index.html").exists())
}

pub fn build_router(web_dir: Option<PathBuf>) -> Router {
  let api_router = api::router();
  match web_dir {
    Some(dir) if dir.join("index.html").exists() => {
      let index = ServeFile::new(dir.join("index.html"));
      let static_files = ServeDir::new(dir).not_found_service(index);
      api_router.fallback_service(static_files)
    }
    _ => api_router,
  }
}
