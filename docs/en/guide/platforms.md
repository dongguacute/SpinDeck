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
| Browser | Modern browsers — UI preview. Playlist import / local playback need the desktop app |
| **Desktop (Tauri)** | macOS / Windows / Linux; native WebView + `invoke` / `cover://`. No Node.js on the user’s machine |
| Desktop (macOS / Windows) | Full QQ Music experience; NetEase playback control available |
| Mobile (iOS / Android) | QQ Music via deep links; NetEase playback control not supported |

::: tip
QQ Music offers the most complete integration: playlist import, playback control, and cross-device deep links.
:::

For how the SPA and desktop shell connect (`invoke` / `cover://`), see [Architecture](./architecture). For OS / hardware floors, see [System Requirements](./system-requirements).
