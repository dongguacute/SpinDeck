---
title: 性能与观感
weight: 17
---

# 性能与观感

SpinDeck 的桌面体验以 **氛围感与画面质量优先**：面向现代设备（Retina / 独立或高性能核显）做流畅的 3D 书架与播放氛围，而不是为过时硬件牺牲观感。内存与 GPU 占用会随 WebView、WebGL 与全屏合成层变化，这是预期行为。

## 设计原则

| 原则 | 说明 |
| --- | --- |
| 观感优先 | 全屏背景模糊、毛玻璃、黑胶光晕、抗锯齿等氛围效果默认保留 |
| 卸屏外、留屏内 | 只释放用户看不见的 GPU 资源；可见画面不主动降质 |
| 以正式包为准 | 用 **release 桌面包** 测内存；`localhost` + Vite 开发模式会额外偏高 |
| 瓶颈在 WebView | Tauri / Rust 壳体积很小；常驻内存主要来自系统 WebView（WebContent / GPU）与前端场景 |

## 3D 书架策略

实现主要在 `apps/web/app/components/PlaylistShelf.tsx`。

### 浏览态（歌单架）

- **视口窗口加载**：只在滚动中心附近挂载 mesh 与封面 / 书脊纹理；窗外槽位保持空组，需要时再加载。
- **封面上限**：过大的封面在上传 GPU 前会缩放到合理边长，避免单张原图撑爆显存。
- **空闲降帧**：拖拽、惯性、GSAP 动画期间保持满帧；画面静止后降低绘制频率，不改变静止画面本身。

### 播放态（选中封面 + 唱臂）

- **进入动画期间**：邻书仍保留纹理，以便滑出动画完整。
- **动画结束后**：卸掉身后书架上其余书的 mesh / 纹理，**仅保留当前选中封面** 的 3D 资源。
- **切歌**：立即只保留新选中那一本。
- **退出播放**：先静默装回浏览窗口内的书，再播放滑回动画（避免 pop-in 打断节奏）。

黑胶层（`@spindeck/vinyl-ui`）与播放背景（模糊封面、毛玻璃渐变）是独立 DOM / CSS 合成，不随书架 cull 消失——这是播放页氛围的一部分。

### 离开页面

路由离开书架时销毁 WebGL 渲染器，并 `forceContextLoss()`，尽快归还 GPU 上下文。

## 活动监视器里常见数字

在 macOS 上，SpinDeck 会拆成多个进程（主进程、WebContent、GPU、Networking）。用户看到的「内存」与「Graphics and Media」往往来自不同进程：

| 类别 | 大致含义 |
| --- | --- |
| 主进程 | Tauri / Rust 壳，通常较小 |
| WebContent | JS 堆、解码图、WebGL 相关资源（通常是最大头） |
| GPU / Graphics and Media | 合成层、IOSurface、WebGL 帧缓冲等 |

全屏 WebGL + CSS 模糊 / `backdrop-filter` 时，Graphics 侧出现数十 MB 量级是正常现象，**不代表泄漏**。对比优化效果时请固定同一页面状态（静默首页 / 浏览架 / 播放页），并使用正式构建。

## 刻意不做的事

下列手段会明显伤害氛围感，**默认不做**：

- 关掉播放背景实时模糊或全屏毛玻璃
- 为省显存把封面 / 书脊纹理砍到发糊
- 为适配老旧 GPU 全面关闭抗锯齿或强制极低分辨率

若未来提供「省电 / 低占用」开关，应作为可选模式，而不是默认路径。

## 相关文档

- [架构](./architecture) — monorepo 与 IPC
- [系统要求](./system-requirements) — OS / 硬件最低与推荐
- [桌面应用](./desktop) — 安装、日志与构建
- [`apps/web` README](https://github.com/dongguacute/SpinDeck/blob/main/apps/web/README.md) — SPA 布局
