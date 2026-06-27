---
title: 桌面应用
weight: 20
---

# 桌面应用

SpinDeck 提供适用于 macOS、Windows 和 Linux 的 [Tauri 2](https://v2.tauri.app/) 桌面壳。桌面版捆绑 Web UI，在 macOS 上推荐用于完整播放控制。

## 下载

从 GitHub Releases 下载预构建的桌面安装包：

**[v1.0.0-beta.3](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.3)**（最新）

按平台选择对应资源（macOS 为 `.dmg` / `.app`，Windows 为 `.msi` / `.exe` 等）。发布构建目前要求用户机器上安装 **Node.js** 以运行内嵌服务器。

::: warning 不可用版本
以下版本因打包后存在**白屏问题**，**不建议使用**：

- [v1.0.0-beta.2](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.2) — 不可用
- [v1.0.0-beta.1](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.1) — 不可用
:::

## 安装与常见问题

SpinDeck 桌面版目前**未经过 Apple / Microsoft 官方签名**，且依赖本机已安装的 **Node.js** 运行内嵌服务器。不同系统在安装或首次打开时可能遇到以下情况。

### 所有平台

| 现象 | 原因 | 处理方式 |
|------|------|----------|
| 打开后白屏或闪退 | 未安装 Node.js，或内嵌服务器启动失败 | 安装 [Node.js 20+](https://nodejs.org/) 后重新打开；仍失败请查看下方日志路径 |
| 提示找不到 `node` | 从图形界面启动时系统 `PATH` 不完整 | 确认 Node 已安装；macOS 用户可优先用 Homebrew 安装（见下文） |

**日志位置（启动失败时排查）：**

- **macOS**：`~/Library/Logs/com.spindeck.app/`
- **Windows**：`%LOCALAPPDATA%\com.spindeck.app\logs\`
- **Linux**：`~/.local/share/com.spindeck.app/logs/`（具体路径因发行版而异）

### macOS

macOS 对未签名应用限制最严，也是**最常见**遇到「无法打开 / 无法安装」的平台。

| 现象 | 原因 | 处理方式 |
|------|------|----------|
| 「无法打开，因为 Apple 无法检查其是否包含恶意软件」 | Gatekeeper 拦截未签名应用 | **方式一**：右键（或 Control + 点击）`SpinDeck.app` → **打开** → 在弹窗中再次点 **打开**。<br>**方式二**：**系统设置 → 隐私与安全性**，在底部找到被拦截提示，点 **仍要打开** |
| 「已损坏，无法打开。你应该将它移到废纸篓」 | 下载文件带有隔离属性（quarantine） | 在终端执行（将路径换成你的 `.app` 实际位置）：<br>`xattr -cr /Applications/SpinDeck.app`<br>然后再次右键 → **打开** |
| 从 DMG 双击无反应 | 未将应用拖入「应用程序」文件夹 | 打开 DMG 后，将 `SpinDeck.app` **拖入「应用程序」**，再从启动台或应用程序文件夹打开 |
| 架构不匹配 | 下载了与芯片不符的构建 | Apple 芯片（M 系列）请选 **macos-arm** 资源；Intel Mac 请选 **macos-intel** |

**推荐安装 Node.js（macOS）：**

```bash
# Homebrew
brew install node
```

安装后可在终端执行 `node -v` 确认版本 ≥ 20。

::: tip
若仍无法打开，请勿仅双击 DMG 内的应用；先复制到「应用程序」再按上述 Gatekeeper 步骤操作。
:::

### Windows

| 现象 | 原因 | 处理方式 |
|------|------|----------|
| SmartScreen：「Windows 已保护你的电脑」 | 安装包未购买 Extended Validation 签名 | 点 **更多信息** → **仍要运行** |
| 安装后无法启动 | 未安装 Node.js | 从 [nodejs.org](https://nodejs.org/) 安装 LTS 版本，安装时勾选 **Add to PATH**，完成后重启 SpinDeck |
| 杀毒软件拦截 | 本地应用会启动 Node 子进程 | 将 SpinDeck 安装目录或 `.exe` 加入白名单 |

### Linux

| 现象 | 原因 | 处理方式 |
|------|------|----------|
| AppImage 无法运行 | 缺少执行权限 | `chmod +x spindeck-*.AppImage` 后再运行 |
| AppImage 提示 FUSE 相关错误 | 系统未安装 FUSE | Ubuntu/Debian：`sudo apt install libfuse2`；或使用 `.deb` 包安装 |
| `.deb` 依赖缺失 | 缺少 WebKit / 图形库 | Debian/Ubuntu：`sudo apt install libwebkit2gtk-4.1-0` 等（从源码构建文档中的依赖列表参考） |
| 启动后白屏 | 未安装 Node.js | 用系统包管理器或 [nvm](https://github.com/nvm-sh/nvm) 安装 Node.js 20+ |

## 从源码构建

### 额外要求

- [Rust](https://rustup.rs/)（stable）
- 平台工具链（例如 macOS 上的 Xcode Command Line Tools）

### 开发

开发时 Tauri 会加载 Web 开发服务器：

```bash
pnpm --filter @spindeck/desktop dev
```

该命令会运行 `@spindeck/web` 开发服务器并打开 SpinDeck 窗口。

### 生产构建

```bash
pnpm --filter @spindeck/desktop build
```

产物输出至 `apps/desktop/src-tauri/target/release/bundle/`（macOS 为 `.app`，Windows 为 `.msi` / `.exe` 等）。

### 图标

桌面图标由 `apps/web/app/assets/icons/SpinDeckLogo.svg` 生成。Logo 变更后请重新生成：

```bash
pnpm desktop:icons
```
