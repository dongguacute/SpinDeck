---
title: Supported Platforms
weight: 30
---

# Supported Platforms

Only **QQ Music** is fully supported end to end. Other integrations vary by platform and environment.

| Platform | Playlist Import | Playback Control | Status |
| --- | :-: | :-: | --- |
| **QQ Music** | ✅ | ✅ | Fully supported |
| **NetEase Cloud Music** | ✅ | Desktop only | Import works; playback control on macOS / Windows only |
| **Kugou Music** | ✅ | — | Import only |
| **Apple Music** | — | — | Not implemented |
| **Spotify** | — | — | Not implemented |
| **YouTube Music** | — | — | Not implemented |

## Runtime Notes

| Environment | Notes |
| --- | --- |
| Browser | Modern browsers; requires a local Node server for API routes |
| **Desktop (Tauri)** | macOS / Windows / Linux; bundles web UI and embedded local server |
| Desktop (macOS / Windows) | Full QQ Music experience; NetEase playback control available |
| Mobile (iOS / Android) | QQ Music via deep links; NetEase playback control not supported |

::: tip
QQ Music offers the most complete integration: playlist import, playback control, and cross-device deep links.
:::
