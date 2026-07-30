---
title: 系统要求
weight: 12
---

# 系统要求

本文区分 **终端用户（跑桌面安装包）** 与 **开发者（从源码构建）**。SpinDeck 以氛围感与 3D 书架为主，**推荐配置面向现代设备**；「最低」仅表示软件栈能启动的兼容底线，不保证流畅或观感达标。

相关：[快速开始](./getting-started) · [桌面应用](./desktop) · [性能与观感](./performance) · [支持的平台](./platforms)

## 一句话对照

| 场景 | 最低（可启动） | 推荐（完整体验） |
| --- | --- | --- |
| macOS | 10.15 Catalina，64 位 | macOS 13+，Apple 芯片或较新的 Intel |
| Windows | Windows 10 x64 + WebView2 | Windows 11 x64，已装最新 WebView2 |
| Linux | 带 **webkit2gtk 4.1** 的 64 位发行版 | Ubuntu 22.04+ / 同等新发行版 |
| 内存 | 系统合计约 **4 GB** 可用 | **8 GB+**（播放页更从容） |
| 显卡 | 支持 **WebGL** 的硬件加速 | 独立 GPU 或近年核显；勿强制软件渲染 |
| 显示器 | 约 **960×640** 可用客户区 | **1280×800** 及以上；Retina / 高分屏更佳 |
| 磁盘 | 约 **50–200 MB** 安装与缓存余量 | SSD，预留 **500 MB+** |
| Node.js | **不需要**（终端用户） | 仅开发 / 构建需要 |

配置来源：`tauri.conf.json` 中 `minimumSystemVersion: "10.15"`、窗口 `minWidth/minHeight: 960×640`；CI 在 Ubuntu 22.04 / 当代 Windows / macOS 上构建。

---

## 终端用户 — 操作系统

### macOS

| 项 | 要求 |
| --- | --- |
| 最低系统 | **macOS 10.15 Catalina**（与打包声明一致） |
| 架构 | **Apple 芯片（arm64）** 与 **Intel（x86_64）** 分开发布，请下载对应包 |
| WebView | 系统 **WKWebView**（随系统更新） |
| 权限 | 暂停 / 继续本地音乐客户端需要 **辅助功能**；详见 [桌面应用](./desktop) |
| Apple Events | 控制第三方音乐 App 可能触发自动化相关提示（`NSAppleEventsUsageDescription`） |

未签名安装的 Gatekeeper / quarantine 处理见 [桌面应用](./desktop)。

### Windows

| 项 | 要求 |
| --- | --- |
| 最低系统 | **Windows 10** x64（Tauri 2 / WebView2 理论支持更早版本，本项目按 Win10+ 验证与发布） |
| 推荐 | **Windows 11**，或 Windows 10 已装最新累积更新 |
| 架构 | 官方发布为 **x86_64**（见 Release 中的 Windows 资源） |
| WebView | **Microsoft Edge WebView2 Runtime**（Win11 通常预装；缺失时安装程序会引导安装） |
| 其他 | 未签名安装可能触发 SmartScreen；杀毒软件偶发拦截 WebView 相关进程 |

### Linux

| 项 | 要求 |
| --- | --- |
| 最低 | 64 位桌面环境，运行时具备 **webkit2gtk-4.1**（Tauri 2） |
| 推荐发行版 | **Ubuntu 22.04+**、Debian 12+，或同等提供 WebKitGTK 4.1 的发行版 |
| 架构 | 官方发布为 **x86_64**（`.deb` / AppImage） |
| AppImage | 可能需要 **FUSE**（如 `libfuse2`）；详见 [桌面应用](./desktop) |
| 显示服务 | X11 或 Wayland（取决于发行版与 WebKitGTK） |

`.deb` 会声明依赖并由包管理器拉取；AppImage 更自包含，但仍依赖系统图形栈。

---

## 终端用户 — 硬件与显示

### CPU

- **最低**：任意常见 **64 位** CPU（与系统架构匹配）。
- **推荐**：近数年桌面 / 笔记本 CPU；3D 书架与全屏模糊会占用一定单核与 GPU 合成。

### 内存（RAM）

| 级别 | 说明 |
| --- | --- |
| 最低 | 整机约 **4 GB**，且能分给 SpinDeck + 系统 WebView 数百 MB 级占用 |
| 推荐 | **8 GB+** |
| 实测参考 | 正式包下，WebContent / 合成层在浏览与播放态可达数百 MB 量级属预期；详见 [性能与观感](./performance) |

内存大头在 **系统 WebView + Three.js / 合成**，不在 Rust 安装包体积。

### 显卡 / GPU

| 级别 | 说明 |
| --- | --- |
| 最低 | 驱动正常、浏览器级 **WebGL** 可用（硬件加速开启） |
| 推荐 | 近年核显或独显；外接屏场景下避免强制「节能 / 软件渲染」 |
| 不推荐 | 无加速的远程桌面 / 纯软件 GL — 书架可能卡顿或无法渲染 |

产品默认保留模糊、毛玻璃、抗锯齿等氛围效果，**不为老旧 GPU 默认降质**。

### 显示器与窗口

| 项 | 值 |
| --- | --- |
| 窗口默认大小 | **1280×800** |
| 窗口最小客户区 | **960×640**（`tauri.conf.json`） |
| 推荐 | ≥ 1280×800；高分屏 / Retina 观感更好 |
| 缩放 | 系统显示缩放 100%–150% 一般可用；极端缩放可能需手动拉大窗口 |

### 存储

| 项 | 说明 |
| --- | --- |
| 安装包 | macOS DMG / 应用通常仅数 MB～数十 MB 量级（随版本变化） |
| 运行 | 日志、封面缓存、WebView 磁盘缓存会额外占用；建议预留 **数百 MB** |
| 介质 | SSD 可缩短冷启动与封面加载时间 |

### 网络

| 用途 | 要求 |
| --- | --- |
| 导入 / 刷新歌单 | 需能访问对应音乐平台接口 |
| 封面图 | 经桌面 `cover://` 代理拉取；需外网或可达 CDN |
| 纯本地浏览已导入数据 | 可不联网（已缓存内容范围内） |

SpinDeck **不**托管或串流音频；播歌依赖本机已安装的音乐客户端。

---

## 终端用户 — 软件依赖（音乐 App）

SpinDeck 本身不播放音频文件。完整「唱臂控制」还需要本机安装对应客户端，且能力因平台而异：

| 音乐平台 | 导入歌单 | 播放控制（概要） |
| --- | --- | --- |
| QQ 音乐 | ✅ | 最完整（深链接 + 桌面控制） |
| 网易云音乐 | ✅ | 桌面端控制（macOS / Windows） |
| 酷狗音乐 | ✅ | 仅导入，无可靠播放控制 |

详见 [支持的平台](./platforms)。

---

## 浏览器预览（仅 UI）

不安装桌面端时，可用现代浏览器打开 Vite 开发服或静态构建做 **界面预览**：

| 项 | 要求 |
| --- | --- |
| 浏览器 | 近两年的 Chrome / Edge / Safari / Firefox（需 WebGL） |
| 能力限制 | **歌单导入与本地播放控制不可用**，需桌面应用 |

---

## 开发者 — 从源码构建

以下为开发 / CI 工具链，**终端用户安装 Release 包不需要**。

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | **≥ 18**（CI 常用 20） | Web / 文档与前端构建 |
| [pnpm](https://pnpm.io/) | **11.x**（仓库锁定 `11.18.0`） | 包管理 |
| [Rust](https://rustup.rs/) | **stable** | 桌面 Tauri 构建 |
| 平台工具链 | 见下 | 链接原生依赖 |

### 各平台额外工具链

| 平台 | 额外要求 |
| --- | --- |
| macOS | Xcode Command Line Tools；按需 `rustup target`（`aarch64-apple-darwin` / `x86_64-apple-darwin`） |
| Windows | [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)；开发机需 WebView2 |
| Linux | `libwebkit2gtk-4.1-dev` 及 Tauri 文档所列依赖（与 CI `release.yml` 一致） |

完整命令见 [快速开始](./getting-started) 与 [桌面应用](./desktop)。

---

## 发布矩阵（当前 CI）

GitHub Release 工作流当前构建：

| 产物标签 | Runner / 目标 |
| --- | --- |
| `macos-arm` | `aarch64-apple-darwin` |
| `macos-intel` | `x86_64-apple-darwin` |
| `windows` | `x86_64-pc-windows-msvc` |
| `linux` | `x86_64-unknown-linux-gnu`（Ubuntu 22.04） |

没有列出的组合（例如 Windows ARM）当前不提供官方预编译包。

---

## 配置声明速查（仓库内）

| 配置 | 位置 | 值 |
| --- | --- | --- |
| macOS 最低系统 | `apps/desktop/src-tauri/tauri.conf.json` → `bundle.macOS.minimumSystemVersion` | `10.15` |
| 默认窗口 | 同上 → `app.windows[0]` | `1280×800` |
| 最小窗口 | 同上 | `960×640` |
| Node engines | 根目录 `package.json` | `>=18` |
| 包管理器 | 根目录 `package.json` → `packageManager` | `pnpm@11.18.0` |
