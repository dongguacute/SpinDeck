<p align="center">
  <img src="public/SpinDeckLogo.svg" alt="SpinDeck logo" width="72" height="72" />
</p>

<h1 align="center">SpinDeck 🎵</h1>

<p align="center"><strong>跨平台黑胶可视化播放器</strong> — 在浏览器中管理歌单、浏览 3D 专辑架，并通过可交互的唱臂界面与本地音乐应用同步播放。</p>

<p align="center"><em>SpinDeck 不提供音频流媒体或托管服务。音乐由你的播放器负责播放，我们负责歌单管理与控制。</em></p>

<p align="center">
  <a href="./README.md">English</a> · 简体中文 · <a href="https://spindeck.dgct.cc">📖 官方文档</a>
</p>

<p align="center">
  <a href="https://github.com/dongguacute/SpinDeck/releases"><img src="https://img.shields.io/github/v/release/dongguacute/SpinDeck?label=latest%20release" alt="Latest release" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white" alt="Node.js >= 18" /></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/rust-stable-DEA584?logo=rust&logoColor=white" alt="Rust stable" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm&logoColor=white" alt="pnpm 9.x" /></a>
</p>

---

## 👀 预览

![SpinDeck 播放界面 — 黑胶唱臂 UI、专辑封面与播放控制](public/Xnip2026-06-27_22-10-36.jpg)

这是 SpinDeck 的播放界面：半透明黑胶唱片与可拖动的唱臂叠在专辑封面上，背景由封面色调柔化渲染。曲目信息显示在唱片标签上；**退出播放**、视觉设置以及上一首/下一首控制分布在界面边缘。

> **📸 截图版权说明**  
> 预览中出现的专辑封面（*1989 (Taylor's Version)*）与歌曲名（*Style (Taylor's Version)*）属于 **Taylor Swift** 及其相关版权方（含 Republic Records）。此处**仅用于演示** SpinDeck 的 UI，本项目**不**托管、分发或授权该内容。SpinDeck 不对上述内容主张任何权利。

---

## ✨ 功能概览

### 📋 歌单管理

- 创建、编辑、批量删除歌单 — 数据全部保存在浏览器本地
- 通过分享链接从 **QQ 音乐**、**网易云音乐** 或 **酷狗音乐** 导入歌单（每次最多 300 首）
- 手动创建歌单（仅元数据，不含曲目列表）
- 已导入歌单可每 5 / 15 / 30 分钟或 1 小时自动刷新，与来源保持同步

### 🗄️ 3D 歌单架

- Three.js 渲染的 3D 专辑架 — 像真实唱片架一样翻阅封面
- 点击唱片播放；通过上一首/下一首或滑动手势切歌
- 封面驱动的动态背景；可上传自定义背景并调节模糊
- 浏览态按视口按需加载；进入播放并稳定后卸掉身后书本，只保留当前封面的 3D（氛围效果保留）

### 🎛️ 黑胶唱臂

- 拖动唱臂 **放下唱针（播放）或抬起（暂停）** — 贴近实体唱机的交互
- 经典或现代两种唱片样式
- 播放状态与已连接的音乐应用同步（取决于平台支持情况）

### 🎨 外观与语言

- 浅色、深色或跟随系统
- 界面支持 **English** 与 **简体中文**

---

## 🚀 典型使用流程

1. 打开 SpinDeck，创建歌单，粘贴受支持平台的分享链接
2. 导入完成后，打开 **歌单架** 浏览封面
3. 选择曲目 — 进入唱臂界面；放下唱针，本地音乐应用开始播放
4. 在设置中调整主题、语言与视觉效果

就这么简单。无需账号、无需上传云端 — 只有你的歌单和你的播放器。

---

## 🎧 支持的音乐平台

各平台进度不同。目前仅 **QQ 音乐** 端到端完整支持。

| 平台 | 歌单导入 | 播放控制 | 状态 |
|------|:--------:|:--------:|------|
| **QQ 音乐** | ✅ | ✅ | **完整支持** — 导入 + 播放控制 |
| **网易云音乐** | ✅ | 仅桌面端 | 导入可用；播放控制仅限 **桌面端**（macOS / Windows） |
| **酷狗音乐** | ✅ | — | **仅导入** — 无播放控制（技术限制） |
| **Apple Music** | — | — | 尚未实现 |
| **Spotify** | — | — | 尚未实现 |
| **YouTube Music** | — | — | 尚未实现 |

> **💡 说明**
>
> - **QQ 音乐** 最完整：歌单导入、播放控制与跨设备深链接。
> - **网易云音乐** — 各端均可导入，但唱臂播放同步**仅限桌面端**（移动端不支持）。
> - **酷狗音乐** — 可在 SpinDeck 中导入浏览，但暂无可靠方式从此处控制酷狗客户端。
> - Apple Music、Spotify、YouTube Music 已在 UI 中预留 — **尚无可用集成**。

---

## 💻 运行方式

SpinDeck 是 **SPA 前端** + **仅桌面端提供的 Tauri 壳**（原生 WebView + `invoke` / `cover://`）。浏览器可用于 UI 预览；完整能力请用 **Tauri 桌面应用**（macOS 推荐，以获得完整播放控制）。

| 环境 | 说明 |
|------|------|
| 浏览器 | 任意现代浏览器 — UI 预览。歌单导入与本地播放需要桌面应用 |
| **桌面端（Tauri）** | macOS / Windows / Linux；原生 WebView + Tauri `invoke` / `cover://`。**用户机器不需要 Node.js** |
| 桌面端（macOS / Windows） | 完整 QQ 音乐体验；网易云播放控制亦在此可用 |
| 移动端（iOS / Android） | QQ 音乐通过深链接；网易云播放控制不支持 |

---

## 📦 版本与依赖

终端用户 OS / 硬件 / WebView 最低与推荐配置：**[系统要求](docs/zh/guide/system-requirements.md)**（English：[System Requirements](docs/en/guide/system-requirements.md)）。

### 最新发布版

从 **[GitHub Releases](https://github.com/dongguacute/SpinDeck/releases)** 下载最新桌面构建 — 发布标题与标签显示当前版本（如 `v0.1.0`）。

在已克隆的仓库中查看版本：

```bash
node -p "require('./package.json').version"
```

### 开发环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| [Node.js](https://nodejs.org/) | **≥ 18** | 仅 Web / 文档开发与前端构建 |
| [pnpm](https://pnpm.io/) | **9.x**（仓库锁定 `9.0.0`） | 安装依赖及所有 `pnpm` 脚本 |
| [Rust](https://rustup.rs/) | stable | 桌面端（Tauri）开发与发布构建 |
| 平台工具链 | — | 如 macOS 上的 Xcode Command Line Tools |

以上要求见根目录 [`package.json`](package.json)（`engines.node`、`packageManager`）。CI 使用 **Node 20** 与 **pnpm 9**。安装 Release 包的终端用户**不需要** Node.js。

通过 [Corepack](https://nodejs.org/api/corepack.html) 启用锁定的 pnpm：

```bash
corepack enable
pnpm -v   # 应显示 9.x
node -v   # 应显示 v18 或更高
```

---

## 🛠️ 快速开始

### 环境要求

见上方 **[版本与依赖](#-版本与依赖)**。简要来说：**Node.js ≥ 18**、**pnpm 9.x**；桌面端开发还需 **Rust（stable）**。

### 本地开发（Web UI）

```bash
# 克隆仓库
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck

# 安装依赖
pnpm install

# 启动 Web SPA 开发服务（仅 UI）
pnpm dev
```

在终端输出的本地 URL 中打开应用。歌单导入与播放需要下方的桌面应用。

### 桌面应用（Tauri）

还需要：

- [Rust](https://rustup.rs/)（stable）
- 平台工具链（如 macOS 上的 Xcode Command Line Tools）

**开发模式** — Tauri 启动 Web Vite 服务并在 WebView 中加载：

```bash
pnpm --filter @spindeck/desktop dev
```

通过 `http://localhost:5173` 加载 `@spindeck/web` 并打开 SpinDeck 窗口。桌面能力通过 `invoke` / `cover://` 提供。应用图标与 `apps/web/app/assets/icons/SpinDeckLogo.svg` 一致。

**生产构建** — 构建 SPA 到 Tauri `frontendDist`，再执行 `tauri build`。打包后的应用通过 Tauri 原生资源协议加载 SPA：

```bash
pnpm --filter @spindeck/desktop build
```

输出目录：`apps/desktop/src-tauri/target/release/bundle/`（macOS 为 `.app`，Windows 为 `.msi` / `.exe` 等）。**终端用户不需要 Node.js。**

Logo 变更后重新生成桌面图标：

```bash
pnpm desktop:icons
```

### 构建（仅 Web SPA）

```bash
pnpm --filter @spindeck/web build
```

静态产物：`apps/web/build/client`（供桌面打包使用）。

### 其他命令

```bash
pnpm lint          # 代码检查（ESLint + 桌面端 Clippy/fmt）
pnpm check-types   # 类型检查
pnpm format        # 代码格式化
pnpm dev:docs      # 文档站（VitePress）
```

预提交（`husky` + `lint-staged`）会对暂存的 JS/TS 跑 ESLint；若暂存了 `apps/desktop/src-tauri` 下的 Rust/`Cargo.toml`，还会跑 `pnpm --filter @spindeck/desktop lint`。

---

## 📁 项目结构

pnpm + Turborepo 单体仓库。**UI 在 TypeScript；歌单导入与本地播放控制在桌面端 Rust 中。**

| 路径 | 职责 |
|------|------|
| [`apps/web`](apps/web) | SPA 前端（React Router，`ssr: false`），通过 `invoke` 调用桌面能力 |
| [`apps/desktop`](apps/desktop) | Tauri 壳 + Rust（`commands/`、`cover`、`playlist/`、`playback/`） |
| [`packages/player`](packages/player) | 前端播放策略、深链接、会话（Tauri 桌面桥接） |
| [`packages/vinyl-ui`](packages/vinyl-ui) | 黑胶唱臂 UI 组件 |
| [`packages/ui`](packages/ui) | 共享 UI 组件与主题 |
| [`packages/picker`](packages/picker) | 封面取色与背景 |
| [`docs`](docs) | VitePress 文档站 |

**开发 / 生产桌面：** SPA 由 Tauri WebView 加载；能力通过 `invoke` 与 `cover://` 提供。

**桌面 IPC：** `import_playlist`、`play_song`、`pause_song`、`resume_song`、`playback_status`、`set_play_mode`。

更完整的说明见 [架构](docs/zh/guide/architecture.md) · [系统要求](docs/zh/guide/system-requirements.md) · [性能与观感](docs/zh/guide/performance.md)（English：[Architecture](docs/en/guide/architecture.md) · [System Requirements](docs/en/guide/system-requirements.md) · [Performance & Visuals](docs/en/guide/performance.md)）。各 app 与共享 package 另有独立 README。

---

## ⚠️ 免责声明

- 本项目**仅供个人学习与技术交流** — 不得用于商业用途。
- 所有媒体内容与数据均来自第三方服务。SpinDeck **不托管或存储**任何受版权保护的音乐文件。
- 使用本项目时请遵守各音乐平台的服务条款及适用法律。

---

## 📄 许可证

采用 [Apache License 2.0](LICENSE) 授权。

---

## 🔗 链接

- **文档**：<https://spindeck.dgct.cc>
- **仓库**：<https://github.com/dongguacute/SpinDeck>
- **Issues**：<https://github.com/dongguacute/SpinDeck/issues>
- **作者**：Cherry Fu · [@dongguacute](https://github.com/dongguacute)

如果 SpinDeck 对你有帮助，欢迎在 GitHub 点个 ⭐ — 感谢来访！
