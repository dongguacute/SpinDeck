---
title: 快速开始
weight: 10
---

# 快速开始

SpinDeck 是一款跨平台黑胶可视化播放器。它在界面中整理歌单，在 3D 专辑架上展示封面，并控制第三方音乐应用的播放。

**一句话架构：** SPA 前端（`apps/web`）+ 仅桌面端的 Tauri 壳（`apps/desktop`）。完整图示与 IPC 列表见 [架构](./architecture)；3D 书架与观感策略见 [性能与观感](./performance)。运行最低 / 推荐配置见 [系统要求](./system-requirements)。

## 环境要求

开发机工具链摘要（终端用户装 Release **不需要** Node / Rust）：

- [Node.js](https://nodejs.org/) ≥ 18（Web / 文档开发与前端构建）
- [pnpm](https://pnpm.io/) 9.x
- [Rust](https://rustup.rs/)（stable）— 桌面端（Tauri）需要

完整 OS / 硬件 / WebView 矩阵见 [系统要求](./system-requirements)。

## 安装

```bash
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck
pnpm install
```

## 推荐：桌面端开发

完整体验（导入 + 播放 + 原生窗口）：

```bash
pnpm --filter @spindeck/desktop dev
```

Tauri 会启动 Web Vite 服务并在 WebView 中加载。桌面能力通过 `invoke` 调用。

## Web 开发（仅 UI）

在 monorepo 根目录启动 SPA：

```bash
pnpm dev
```

或仅运行 Web 应用：

```bash
pnpm --filter @spindeck/web dev
```

在终端输出的本地地址打开应用。歌单导入与播放需要桌面应用 — 请按上方方式运行桌面 `dev`。

## 构建 Web SPA

```bash
pnpm --filter @spindeck/web build
```

静态产物：`apps/web/build/client`（桌面端 Tauri `frontendDist`）。

## 其他命令

```bash
pnpm lint          # ESLint + 桌面 Rust fmt/clippy
pnpm check-types   # 类型检查
pnpm format        # 代码格式化
pnpm dev:docs      # 文档站
```

请参阅 [系统要求](./system-requirements) 了解最低 / 推荐配置，[桌面应用](./desktop) 了解打包与安装排障，[架构](./architecture) 了解模块划分，[性能与观感](./performance) 了解书架内存策略，或 [支持的平台](./platforms) 了解音乐服务兼容性。

## 扩展 UI

- [扩展 `@spindeck/ui`](./extending-ui) — 主题族与材质契约
- [扩展 `@spindeck/vinyl-ui`](./extending-vinyl-ui) — 黑胶播放器视觉风格
