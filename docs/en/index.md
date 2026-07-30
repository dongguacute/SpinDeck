---
layout: home

hero:
  name: SpinDeck
  text: Vinyl visualization player
  tagline: Organize playlists in your browser, browse a 3D album shelf, and sync playback with local music apps through an interactive tonearm UI.
  image:
    src: /SpinDeckLogo.svg
    alt: SpinDeck
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/dongguacute/SpinDeck

features:
  - title: Playlist Management
    details: Create, import, and auto-refresh playlists from QQ Music, NetEase Cloud Music, and Kugou Music. Data stays in your browser; import runs through the desktop Rust API.
  - title: 3D Album Shelf
    details: Browse album artwork on a Three.js-rendered shelf with viewport-aware loading. Tap a record to play and swipe to skip tracks.
  - title: Vinyl Tonearm
    details: Drop the needle to play or lift it to pause — tactile turntable-style interaction synced with your music app.
  - title: Desktop-first Runtime
    details: Use the Tauri desktop app for the full experience (embedded Rust HTTP on localhost). Browser mode is for UI preview.
---

::: warning Disclaimer
SpinDeck does not stream or host any audio. All music is played by third-party apps; this project handles playlist management and playback control only.
:::
