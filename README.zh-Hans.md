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

可在 **浏览器** 或 **Tauri 桌面应用** 中运行 SpinDeck（macOS 桌面端推荐，以获得完整播放控制体验）。

| 环境 | 说明 |
|------|------|
| 浏览器 | 任意现代浏览器（Chrome、Safari、Firefox、Edge 等）— 需本地 Node 服务提供 API 路由（`pnpm --filter @spindeck/web dev` 或 `start`） |
| **桌面端（Tauri）** | macOS / Windows / Linux 原生窗口；发布版打包 Web UI 与内嵌本地服务 |
| 桌面端（macOS / Windows） | 完整 QQ 音乐体验；网易云播放控制亦在此可用 |
| 移动端（iOS / Android） | QQ 音乐通过深链接；网易云播放控制不支持 |

---

## 📦 版本与依赖

### 最新发布版

从 **[GitHub Releases](https://github.com/dongguacute/SpinDeck/releases)** 下载最新桌面构建 — 发布标题与标签显示当前版本（如 `v0.1.0`）。

在已克隆的仓库中查看版本：

```bash
node -p "require('./package.json').version"
```

### 开发环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| [Node.js](https://nodejs.org/) | **≥ 18** | Web 开发、API 服务、桌面端内嵌服务 |
| [pnpm](https://pnpm.io/) | **9.x**（仓库锁定 `9.0.0`） | 安装依赖及所有 `pnpm` 脚本 |
| [Rust](https://rustup.rs/) | stable | 仅桌面端（Tauri）开发与构建 |
| 平台工具链 | — | 如 macOS 上的 Xcode Command Line Tools |

以上要求见根目录 [`package.json`](package.json)（`engines.node`、`packageManager`）。CI 使用 **Node 20** 与 **pnpm 9**。

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

### 本地开发（Web）

```bash
# 克隆仓库
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

在终端输出的本地 URL 中打开应用。

### 桌面应用（Tauri）

还需要：

- [Rust](https://rustup.rs/)（stable）
- 平台工具链（如 macOS 上的 Xcode Command Line Tools）

**开发模式** — Tauri 加载 Web 开发服务器：

```bash
pnpm --filter @spindeck/desktop dev
```

会运行 `@spindeck/web` 开发服务并打开 SpinDeck 窗口。应用图标与 `apps/web/app/assets/icons/SpinDeckLogo.svg` 一致。

**生产构建** — 打包 Web 构建产物与内嵌 Node 运行时：

```bash
pnpm --filter @spindeck/desktop build
```

输出目录：`apps/desktop/src-tauri/target/release/bundle/`（macOS 为 `.app`，Windows 为 `.msi` / `.exe` 等）。

当前发布版仍要求用户机器上安装 **Node.js** 以运行内嵌服务。Logo 变更后需重新生成桌面图标（编辑含 macOS 安全区内边距的 `apps/desktop/assets/app-icon.svg`）：

```bash
pnpm desktop:icons
```

### 构建与生产（仅 Web）

```bash
pnpm build
pnpm --filter @spindeck/web start
```

### 其他命令

```bash
pnpm lint          # 代码检查
pnpm check-types   # 类型检查
pnpm format        # 代码格式化
```

---

## 📁 项目结构

pnpm + Turborepo 单体仓库：

| 路径 | 说明 |
|------|------|
| [`apps/web`](apps/web) | SpinDeck Web 应用 |
| [`apps/desktop`](apps/desktop) | Tauri 2 桌面壳（`src-tauri/` 位于此目录） |
| [`packages/core`](packages/core) | 核心逻辑（歌单拉取等） |
| [`packages/player`](packages/player) | 第三方音乐应用控制与深链接 |
| [`packages/vinyl-ui`](packages/vinyl-ui) | 黑胶唱臂 UI 组件 |
| [`packages/ui`](packages/ui) | 共享 UI 组件与主题 |
| [`packages/picker`](packages/picker) | 封面取色与背景 |

各 package 另有独立 README，细节见对应目录。

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
