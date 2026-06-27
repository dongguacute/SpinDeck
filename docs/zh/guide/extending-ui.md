---
title: UI 主题扩展
weight: 40
---

# 扩展 `@spindeck/ui`

[`@spindeck/ui`](https://github.com/dongguacute/SpinDeck/tree/main/packages/ui) 是 SpinDeck 的核心视觉与材质系统。它通过严格的 **材质契约（Material Contract）** 约束主题族，使界面可以在切换颜色、阴影与质感的同时保持布局稳定。

## 核心概念

| 概念 | 说明 |
| :--- | :--- |
| **材质契约** | 一组固定的 CSS 变量，主题只能覆盖这些变量；布局、间距与字体大小锁定在 `base.css` 中。 |
| **主题族** | 一种视觉风格组（如 Cafe），通过 `sd-theme-cafe` 等 class 应用。 |
| **外观模式** | 浅色 / 深色模式，通过根元素上的 `data-theme` 控制。 |

内置主题族包括 **Cafe（咖啡馆）** — 浅色为奶油白，深色为深焙咖啡色调。

## 安装

在 SpinDeck monorepo 内，向目标应用或包添加依赖：

```bash
pnpm add @spindeck/ui --workspace
```

## 基本用法

### 1. 导入样式

在应用入口 CSS 中（例如 `apps/web/app/app.css`）：

```css
/* 材质契约默认值 */
@import "@spindeck/ui/styles/base.css";

/* 主题族 */
@import "@spindeck/ui/themes/cafe.css";
```

### 2. 应用主题 class

在 `<body>` 上设置主题族，在 `<html>` 上设置外观模式：

```html
<html data-theme="light">
  <body class="sd-theme-cafe">
    <!-- 以 Cafe 浅色模式渲染 -->
  </body>
</html>
```

SpinDeck Web 应用在运行时解析 `system` 模式，并通过 `useThemeStore` 同步这两个属性。

### 3. 在 TypeScript 中引用配置

```typescript
import { THEMES, THEME_CONFIGS, type ThemeType, type AppearanceMode } from "@spindeck/ui";

console.log(THEME_CONFIGS[THEMES.CAFE].name);       // "咖啡馆"
console.log(THEME_CONFIGS[THEMES.CAFE].className);  // "sd-theme-cafe"
console.log(THEME_CONFIGS[THEMES.CAFE].preview.light); // "#fdfaf2"
```

## 材质契约（CSS 变量）

主题族 **只能覆盖** 以下变量，不要在主题文件中修改布局相关属性。

| 变量 | 说明 |
| :--- | :--- |
| `--bg-primary` | 主背景 |
| `--bg-secondary` | 次级背景 |
| `--bg-tertiary` | 第三级背景 |
| `--surface-color` | 卡片、按钮、面板 |
| `--surface-hover` | 表面 hover 态 |
| `--text-primary` | 主文字 |
| `--text-secondary` | 次级文字 |
| `--text-muted` | 弱化文字 |
| `--border-color` | 边框 |
| `--border-highlight` | 高亮边框 |
| `--shadow-raised` | 凸起 / 拟物阴影 |
| `--shadow-pressed` | 按下 / 内凹阴影 |
| `--shadow-card` | 卡片阴影 |
| `--radius-sm` … `--radius-full` | 圆角 |

动画时长 token（`--sd-transition-*`）定义在 `base.css` 中，所有主题共享。

## 创建新主题族

### 步骤 1 — 添加主题 CSS 文件

创建 `packages/ui/src/themes/ocean.css`：

```css
/* Ocean 主题族 — 仅覆盖材质契约变量 */

.sd-theme-ocean {
  /* 此处不写布局规则 */
}

[data-theme="light"] .sd-theme-ocean,
.sd-theme-ocean[data-theme="light"] {
  --bg-primary: #e0f2f1;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f5fffe;
  --surface-color: #ffffff;
  --surface-hover: #b2dfdb;
  --text-primary: #004d40;
  --text-secondary: #00695c;
  --text-muted: #4db6ac;
  --border-color: #80cbc4;
  --border-highlight: rgba(255, 255, 255, 0.4);
  --shadow-raised: 0 4px 0 #4db6ac, 0 8px 15px rgba(0, 77, 64, 0.12);
  --shadow-pressed: 0 2px 0 #4db6ac, inset 0 2px 4px rgba(0, 0, 0, 0.08);
  --shadow-card: 0 4px 0 #4db6ac, 0 12px 24px rgba(0, 77, 64, 0.08);
}

[data-theme="dark"] .sd-theme-ocean,
.sd-theme-ocean[data-theme="dark"] {
  --bg-primary: #004d40;
  --bg-secondary: #006064;
  --bg-tertiary: #00838f;
  --surface-color: #00838f;
  --surface-hover: #006064;
  --text-primary: #e0f2f1;
  --text-secondary: #80cbc4;
  --text-muted: #4db6ac;
  --border-color: #00695c;
  --border-highlight: rgba(224, 242, 241, 0.1);
  --shadow-raised: 0 4px 0 #004d40, 0 8px 15px rgba(0, 0, 0, 0.4);
  --shadow-pressed: 0 2px 0 #004d40, inset 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 4px 0 #004d40, 0 10px 20px rgba(0, 0, 0, 0.4);
}
```

可参考内置 [Cafe 主题](https://github.com/dongguacute/SpinDeck/blob/main/packages/ui/src/themes/cafe.css) 中的交互增强（如按钮按下效果）。

### 步骤 2 — 在 TypeScript 中注册

更新 `packages/ui/src/index.ts`：

```typescript
export const THEMES = {
  CAFE: 'cafe',
  OCEAN: 'ocean',
} as const;

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  [THEMES.CAFE]: { /* 已有配置 */ },
  [THEMES.OCEAN]: {
    name: 'Ocean',
    className: 'sd-theme-ocean',
    preview: {
      light: '#e0f2f1',
      dark: '#004d40',
    },
  },
};
```

设置页会遍历 `THEME_CONFIGS`，新主题会自动出现在主题选择器中。

### 步骤 3 — 在 Web 应用中导入

在 `apps/web/app/app.css` 中添加：

```css
@import "@spindeck/ui/themes/ocean.css";
```

若单独开发该包，需重新构建：

```bash
pnpm --filter @spindeck/ui build
```

## 设计规范

- **只改材质** — 主题文件只覆盖 CSS 变量，不要设置 `padding`、`font-size`、`display` 等结构属性。
- **双模式完整** — 必须同时定义浅色与深色的变量集。
- **预览色** — 为 `preview.light` 和 `preview.dark` 提供有代表性的颜色，供设置页色块展示。
- **应用层样式** — 页面级布局与动画放在 `apps/web`，并消费材质契约变量（见 `apps/web/app/app.css`）。

## 包开发命令

```bash
pnpm --filter @spindeck/ui dev    # 监听构建
pnpm --filter @spindeck/ui build  # 生产构建
```

CSS 通过子路径导出：

- `@spindeck/ui/styles/base.css`
- `@spindeck/ui/themes/<name>.css`

另请参阅 [扩展 `@spindeck/vinyl-ui`](./extending-vinyl-ui)，了解黑胶播放器视觉样式的扩展方式。
