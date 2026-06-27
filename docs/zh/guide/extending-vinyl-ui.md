---
title: 黑胶风格扩展
weight: 50
---

# 扩展 `@spindeck/vinyl-ui`

[`@spindeck/vinyl-ui`](https://github.com/dongguacute/SpinDeck/tree/main/packages/vinyl-ui) 是 SpinDeck 的模块化黑胶唱片播放器 UI 库。它将 **结构**（布局、动画、交互）与 **装饰**（颜色、纹路、高光）分离，让你可以仅用 CSS 添加新的视觉风格。

## 特性

- **交互唱臂** — 拖动唱臂到唱片上播放，抬起暂停。
- **播放反馈** — 旋转动画与光晕效果随播放状态同步。
- **自适应布局** — 通过 CSS 变量根据视口计算尺寸与位置。
- **可扩展样式** — Base + Theme 的 CSS 架构，便于新增黑胶外观。

## 安装

在工作区包中添加依赖：

```json
{
  "dependencies": {
    "@spindeck/vinyl-ui": "workspace:*"
  }
}
```

或在 monorepo 根目录执行：

```bash
pnpm add @spindeck/vinyl-ui --workspace
```

## 基本用法

### 1. 导入样式

在全局 CSS 中导入基础结构与至少一种风格主题：

```css
@import "@spindeck/vinyl-ui/styles/base.css";
@import "@spindeck/vinyl-ui/styles/classic.css";
@import "@spindeck/vinyl-ui/styles/modern.css";
```

### 2. 渲染组件

```tsx
import { SongVinylOverlay } from "@spindeck/vinyl-ui";

function PlayerPage() {
  return (
    <SongVinylOverlay
      song={currentSong}
      platform="QQMusic"
      visible={true}
      pageSessionId="unique-session-id"
      styleName="classic"
      theme="dark"
      tonearmTitle={t("vinyl.tonearm_title")}
      playLabel={t("vinyl.play")}
      pauseLabel={t("vinyl.pause")}
    />
  );
}
```

共享包不依赖 `i18next`，请在应用层通过 props 传入已翻译的文案。

## 组件 API

### `SongVinylOverlay`

| Prop | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `song` | `SongInfo` | 必填 | 歌曲元数据（名称、艺术家、封面）。 |
| `platform` | `PlatformType` | 必填 | 用于播放控制的音乐平台。 |
| `visible` | `boolean` | 必填 | 控制可见性与入场动画。 |
| `pageSessionId` | `string` | 必填 | 当前页面会话的唯一 ID。 |
| `theme` | `"dark" \| "light"` | `"dark"` | 用于推导光晕颜色。 |
| `styleName` | `string` | `"classic"` | 对应 `.sd-vinyl-style-${styleName}`。 |
| `tonearmPortalRef` | `RefObject` | — | 可选，将唱臂 portal 到指定层。 |
| `tonearmTitle` | `string` | — | 唱臂 tooltip（传入翻译后的文本）。 |
| `playLabel` / `pauseLabel` | `string` | — | 播放操作的无障碍标签。 |
| `vinylColor` / `labelColor` | `string` | — | 覆盖从专辑封面推导的颜色。 |

### 其他导出

- `VinylStylePreview` — 风格选择器中的迷你预览。
- `Tonearm` — 独立的唱臂 SVG 组件。
- `./lib/vinyl-layout` 与 `./lib/colors` 中的布局与颜色工具函数。

## CSS 架构

### 基础层（`base.css`）

负责定位、层级、旋转动画、唱臂交互与响应式尺寸。主要 class：

| Class | 作用 |
| :--- | :--- |
| `.sd-vinyl-stage` | 主 overlay 容器 |
| `.sd-vinyl-disc` | 黑胶碟片元素 |
| `.sd-vinyl-grooves` / `.sd-vinyl-grooves--fine` | 纹路纹理层 |
| `.sd-vinyl-sheen` | 高光 / 反射层 |
| `.sd-vinyl-center` | 标签区域（歌名、艺术家） |
| `.sd-vinyl-arm-wrap` / `.sd-vinyl-arm` | 唱臂容器与 SVG |
| `.sd-vinyl-stage--playing` / `--pending` / `--interactive` | 状态修饰符 |

布局 CSS 变量（由 `computeVinylLayout` 设置）：

- `--vinyl-size` — 碟片直径（像素）
- `--vinyl-offset-x` — 相对中心的水平偏移
- `--tonearm-height-ratio` — 唱臂高度相对碟片的比例

### 风格层（`classic.css`、`modern.css` 等）

每种风格使用 `.sd-vinyl-style-<name>` 前缀，装饰基础元素。内置风格：

| 风格 | 特点 |
| :--- | :--- |
| `classic` | 丰富纹路、暖色渐变、细腻高光 |
| `modern` | 扁平、高对比、极简纹理 |

## 创建新黑胶风格

### 步骤 1 — 添加风格 CSS 文件

创建 `packages/vinyl-ui/src/styles/retro.css`：

```css
.sd-vinyl-style-retro .sd-vinyl-disc {
  --vinyl-color: #c62828;
  --vinyl-label-color: #ffeb3b;
  background:
    radial-gradient(circle at 50% 50%, transparent 18%, rgba(255, 255, 255, 0.08) 19%, transparent 20%),
    radial-gradient(circle, color-mix(in srgb, var(--vinyl-color) 60%, #000) 0%, var(--vinyl-color) 100%);
  border: 4px solid color-mix(in srgb, var(--vinyl-color) 50%, white);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.sd-vinyl-style-retro .sd-vinyl-grooves {
  background: repeating-radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.12) 0 0.5px,
    transparent 0.5px 2px
  );
  opacity: 0.8;
}

.sd-vinyl-style-retro .sd-vinyl-center {
  border: 2px solid rgba(255, 255, 255, 0.2);
}
```

使用 `--vinyl-color` 与 `--vinyl-label-color`，以便组件在运行时从专辑封面注入颜色。

### 步骤 2 — 在 Web 应用中导入

在 `apps/web/app/app.css` 中添加：

```css
@import "@spindeck/vinyl-ui/styles/retro.css";
```

### 步骤 3 — 在设置中暴露

在风格选择器列表中注册新 style ID。SpinDeck 中需更新 `SettingsModal.tsx`：

```tsx
{["classic", "modern", "retro"].map((styleId) => (
  // ...
  <VinylStylePreview styleName={styleId} /* ... */ />
))}
```

选中的 `styleId` 保存在 `VisualSettings.vinylStyle` 中，并作为 `styleName` 传给 `SongVinylOverlay`。

### 步骤 4 — 使用新风格

```tsx
<SongVinylOverlay
  styleName="retro"
  song={song}
  platform={platform}
  visible={visible}
  pageSessionId={pageSessionId}
/>
```

## 设计规范

- **装饰，不重构** — 在 `.sd-vinyl-style-<name>` 下覆盖颜色、渐变、边框与阴影；不要在风格文件中修改 `position`、`width` 或动画关键帧。
- **尊重状态 class** — 在 `--playing`、`--pending`、`--interactive` 等状态下测试效果。
- **专辑色驱动** — 优先使用 `var(--vinyl-color)`，以支持封面取色。
- **预览组件** — 选择器中使用相同 `styleName` 的 `VinylStylePreview`，保持缩略图一致。

## 包开发命令

```bash
pnpm --filter @spindeck/vinyl-ui dev    # 监听构建
pnpm --filter @spindeck/vinyl-ui build  # 生产构建
pnpm --filter @spindeck/vinyl-ui lint   # 代码检查
```

CSS 通过以下路径导出：

- `@spindeck/vinyl-ui/styles/base.css`
- `@spindeck/vinyl-ui/styles/<name>.css`

另请参阅 [扩展 `@spindeck/ui`](./extending-ui)，了解应用级主题族与材质契约。
