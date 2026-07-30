---
title: 快速开始
weight: 10
---

# 快速开始

SpinDeck 是一款跨平台黑胶可视化播放器。它在界面中整理歌单，在 3D 专辑架上展示封面，并控制第三方音乐应用的播放。

**一句话架构：** SPA 前端（`apps/web`）+ 仅桌面端的 Rust 本地 API（`apps/desktop`）。完整图示与 `/api` 列表见 [架构](./architecture)。

## 环境要求

- [Node.js](https://nodejs.org/) ≥ 18（Web / 文档开发与前端构建）
- [pnpm](https://pnpm.io/) 9.x
- [Rust](https://rustup.rs/)（stable）— 桌面端（Tauri）与本地 `/api` 服务需要

## 安装

```bash
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck
pnpm install
```

## 推荐：桌面端开发

完整体验（导入 + 播放 API + 原生窗口）：

```bash
pnpm --filter @spindeck/desktop dev
```

Tauri 会启动 Web Vite 服务与 `:17345` 上的 Rust API；Vite 将 `/api` 代理到该端口。

## Web 开发（仅 UI）

在 monorepo 根目录启动 SPA：

```bash
pnpm dev
```

或仅运行 Web 应用：

```bash
pnpm --filter @spindeck/web dev
```

在终端输出的本地地址打开应用。Vite 会将 `/api` 代理到 `127.0.0.1:17345`。歌单导入与播放需要 Rust 服务 — 请按上方方式运行桌面 `dev`（或与 Web 并行）。

## 构建 Web SPA

```bash
pnpm --filter @spindeck/web build
```

静态产物：`apps/web/build/client`（供桌面打包使用）。

## 其他命令

```bash
pnpm lint          # ESLint + 桌面 Rust fmt/clippy
pnpm check-types   # 类型检查
pnpm format        # 代码格式化
pnpm dev:docs      # 文档站
```

请参阅 [桌面应用](./desktop) 了解打包与安装排障，[架构](./architecture) 了解模块划分，或 [支持的平台](./platforms) 了解音乐服务兼容性。

## 扩展 UI

- [扩展 `@spindeck/ui`](./extending-ui) — 主题族与材质契约
- [扩展 `@spindeck/vinyl-ui`](./extending-vinyl-ui) — 黑胶播放器视觉风格
