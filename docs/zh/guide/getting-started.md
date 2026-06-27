# 快速开始

SpinDeck 是一款跨平台黑胶可视化播放器。它在浏览器中整理歌单，在 3D 专辑架上展示封面，并控制第三方音乐应用的播放。

## 环境要求

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) 9.x

## 安装

```bash
git clone https://github.com/dongguacute/SpinDeck.git
cd SpinDeck
pnpm install
```

## Web 开发

在 monorepo 根目录启动开发服务器：

```bash
pnpm dev
```

或仅运行 Web 应用：

```bash
pnpm --filter @spindeck/web dev
```

在终端输出的本地地址打开应用。

## 生产构建

```bash
pnpm build
pnpm --filter @spindeck/web start
```

## 其他命令

```bash
pnpm lint          # 代码检查
pnpm check-types   # 类型检查
pnpm format        # 代码格式化
```

请参阅 [桌面应用](./desktop) 了解 Tauri 壳，或 [支持的平台](./platforms) 了解音乐服务兼容性。
