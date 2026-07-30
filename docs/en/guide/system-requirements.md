---
title: System Requirements
weight: 12
---

# System Requirements

This page separates **end users** (running a desktop installer) from **developers** (building from source). SpinDeck is atmosphere- and 3D-shelf-first: **recommended specs target modern machines**. “Minimum” means the software stack can start—not that the experience will feel smooth or look as intended.

Related: [Getting Started](./getting-started) · [Desktop App](./desktop) · [Performance & Visuals](./performance) · [Supported Platforms](./platforms)

## At a glance

| Scenario | Minimum (can launch) | Recommended (full experience) |
| --- | --- | --- |
| macOS | 10.15 Catalina, 64-bit | macOS 13+, Apple silicon or recent Intel |
| Windows | Windows 10 x64 + WebView2 | Windows 11 x64 with up-to-date WebView2 |
| Linux | 64-bit distro with **webkit2gtk 4.1** | Ubuntu 22.04+ / equivalent |
| Memory | About **4 GB** system RAM available | **8 GB+** (more headroom on the playback screen) |
| GPU | Hardware-accelerated **WebGL** | Recent iGPU or discrete GPU; avoid forced software GL |
| Display | ~**960×640** usable client area | **1280×800** or larger; Retina / HiDPI preferred |
| Disk | ~**50–200 MB** free for install + caches | SSD with **500 MB+** free |
| Node.js | **Not required** (end users) | Only for development / builds |

Sources: `minimumSystemVersion: "10.15"` and window `minWidth/minHeight: 960×640` in `tauri.conf.json`; CI builds on Ubuntu 22.04 and current Windows / macOS runners.

---

## End users — operating systems

### macOS

| Item | Requirement |
| --- | --- |
| Minimum OS | **macOS 10.15 Catalina** (matches the bundle declaration) |
| Architecture | Separate **Apple silicon (arm64)** and **Intel (x86_64)** builds — download the matching asset |
| WebView | System **WKWebView** (updates with macOS) |
| Permissions | **Accessibility** is required for pause / resume of local music clients; see [Desktop App](./desktop) |
| Apple Events | Controlling third-party music apps may prompt for automation (`NSAppleEventsUsageDescription`) |

Gatekeeper / quarantine steps for unsigned builds: [Desktop App](./desktop).

### Windows

| Item | Requirement |
| --- | --- |
| Minimum OS | **Windows 10** x64 (Tauri 2 / WebView2 can go older in theory; this project ships and validates for Win10+) |
| Recommended | **Windows 11**, or Windows 10 with current cumulative updates |
| Architecture | Official releases are **x86_64** (see the Windows asset on Releases) |
| WebView | **Microsoft Edge WebView2 Runtime** (usually preinstalled on Win11; the installer bootstraps it when missing) |
| Other | Unsigned builds may trip SmartScreen; antivirus may flag WebView-related processes |

### Linux

| Item | Requirement |
| --- | --- |
| Minimum | 64-bit desktop with **webkit2gtk-4.1** at runtime (Tauri 2) |
| Recommended distros | **Ubuntu 22.04+**, Debian 12+, or equivalents that ship WebKitGTK 4.1 |
| Architecture | Official releases are **x86_64** (`.deb` / AppImage) |
| AppImage | May need **FUSE** (e.g. `libfuse2`); see [Desktop App](./desktop) |
| Display server | X11 or Wayland (depends on distro + WebKitGTK) |

`.deb` declares dependencies for the package manager; AppImage is more self-contained but still needs the system graphics stack.

---

## End users — hardware & display

### CPU

- **Minimum**: Any common **64-bit** CPU matching the OS build.
- **Recommended**: A recent laptop/desktop CPU; the 3D shelf and fullscreen blur use some CPU and GPU compositing.

### Memory (RAM)

| Level | Notes |
| --- | --- |
| Minimum | About **4 GB** system-wide, with hundreds of MB available for SpinDeck + the system WebView |
| Recommended | **8 GB+** |
| Observed | On release builds, WebContent / compositing in the hundreds of MB during browse/playback is expected; see [Performance & Visuals](./performance) |

Most resident memory is the **system WebView + Three.js / compositing**, not the Rust binary size.

### GPU

| Level | Notes |
| --- | --- |
| Minimum | Working drivers with browser-class **WebGL** (hardware acceleration on) |
| Recommended | Recent iGPU or discrete GPU; avoid forced “power saving / software rendering” on external displays |
| Not recommended | Software-only GL / some remote-desktop setups — the shelf may stutter or fail to render |

By default SpinDeck keeps blur, glass, antialiasing, and similar mood effects; it does **not** soft-downgrade for legacy GPUs.

### Display & window

| Item | Value |
| --- | --- |
| Default window | **1280×800** |
| Minimum client area | **960×640** (`tauri.conf.json`) |
| Recommended | ≥ 1280×800; HiDPI / Retina looks better |
| Scaling | 100%–150% OS scale is usually fine; extreme scaling may need a larger window |

### Storage

| Item | Notes |
| --- | --- |
| Installer | macOS DMG / app is typically a few MB to tens of MB (varies by release) |
| Runtime | Logs, cover caches, and WebView disk cache need extra space — reserve **hundreds of MB** |
| Media | SSD shortens cold start and cover loading |

### Network

| Use | Requirement |
| --- | --- |
| Import / refresh playlists | Reach the music platform APIs |
| Cover art | Fetched via desktop `cover://` proxy; needs outbound / CDN access |
| Offline browse of already imported data | Possible within what is already cached |

SpinDeck does **not** host or stream audio; playback depends on a local music client.

---

## End users — music app dependencies

SpinDeck does not play audio files itself. Full tonearm control also needs the corresponding client installed; depth varies by platform:

| Music platform | Playlist import | Playback control (summary) |
| --- | --- | --- |
| QQ Music | ✅ | Most complete (deep links + desktop control) |
| NetEase Cloud Music | ✅ | Desktop control (macOS / Windows) |
| Kugou Music | ✅ | Import only — no reliable playback control |

See [Supported Platforms](./platforms).

---

## Browser preview (UI only)

Without the desktop app, a modern browser can open the Vite dev server or a static build for **UI preview**:

| Item | Requirement |
| --- | --- |
| Browser | Recent Chrome / Edge / Safari / Firefox with WebGL |
| Limits | **Playlist import and local playback control are unavailable** — use the desktop app |

---

## Developers — building from source

Toolchain for development / CI. **End users installing a Release build do not need these.**

| Tool | Version | Purpose |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | **≥ 22.13** (CI uses 22) | Web / docs and frontend builds |
| [pnpm](https://pnpm.io/) | **11.x** (repo pins `11.18.0`) | Package manager |
| [Rust](https://rustup.rs/) | **stable** | Desktop Tauri builds |
| Platform toolchain | See below | Native link dependencies |

### Per-platform extras

| Platform | Extra requirements |
| --- | --- |
| macOS | Xcode Command Line Tools; optional `rustup` targets (`aarch64-apple-darwin` / `x86_64-apple-darwin`) |
| Windows | [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/); WebView2 on the dev machine |
| Linux | `libwebkit2gtk-4.1-dev` and the other deps listed in Tauri’s docs (matches CI `release.yml`) |

Commands: [Getting Started](./getting-started) and [Desktop App](./desktop).

---

## Release matrix (current CI)

The GitHub Release workflow currently builds:

| Asset label | Runner / target |
| --- | --- |
| `macos-arm` | `aarch64-apple-darwin` |
| `macos-intel` | `x86_64-apple-darwin` |
| `windows` | `x86_64-pc-windows-msvc` |
| `linux` | `x86_64-unknown-linux-gnu` (Ubuntu 22.04) |

Combinations not listed (e.g. Windows ARM) have no official prebuilt package yet.

---

## Config cheat sheet (in-repo)

| Setting | Location | Value |
| --- | --- | --- |
| macOS minimum | `apps/desktop/src-tauri/tauri.conf.json` → `bundle.macOS.minimumSystemVersion` | `10.15` |
| Default window | same → `app.windows[0]` | `1280×800` |
| Minimum window | same | `960×640` |
| Node engines | root `package.json` | `>=22.13` |
| Package manager | root `package.json` → `packageManager` | `pnpm@11.18.0` |
