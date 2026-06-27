---
title: 桌面应用
weight: 20
---

# 桌面应用

SpinDeck 提供适用于 macOS、Windows 和 Linux 的 [Tauri 2](https://v2.tauri.app/) 桌面壳。桌面版捆绑 Web UI，在 macOS 上推荐用于完整播放控制。

## 下载

从 GitHub Releases 下载预构建的桌面安装包：

**[v1.0.0-beta.1](https://github.com/dongguacute/SpinDeck/releases/tag/v1.0.0-beta.1)**

按平台选择对应资源（macOS 为 `.dmg` / `.app`，Windows 为 `.msi` / `.exe` 等）。发布构建目前要求用户机器上安装 **Node.js** 以运行内嵌服务器。

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
