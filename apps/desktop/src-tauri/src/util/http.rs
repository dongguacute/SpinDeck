//! Shared outbound HTTP clients for playlist providers and image proxy.

use once_cell::sync::Lazy;
use reqwest::Client;

static HTTP: Lazy<Client> = Lazy::new(|| {
  Client::builder()
    .redirect(reqwest::redirect::Policy::none())
    .timeout(std::time::Duration::from_secs(20))
    .pool_max_idle_per_host(4)
    .build()
    .expect("failed to build HTTP client")
});

static HTTP_FOLLOW: Lazy<Client> = Lazy::new(|| {
  Client::builder()
    .redirect(reqwest::redirect::Policy::limited(10))
    .timeout(std::time::Duration::from_secs(20))
    .pool_max_idle_per_host(4)
    .build()
    .expect("failed to build follow HTTP client")
});

pub fn http_client() -> Result<Client, String> {
  Ok(HTTP.clone())
}

pub fn http_client_follow() -> Result<Client, String> {
  Ok(HTTP_FOLLOW.clone())
}
