//! Shared helpers used across playlist providers and the HTTP layer.

pub mod html;
pub mod http;

pub use html::decode_html_entities;
pub use http::{http_client, http_client_follow};
